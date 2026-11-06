import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { orderService, adminService } from '../services/dataService';
import { formatCurrency, getISTDateString, getBusinessDateOf, isFromEarlierDay, formatShortDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import useOrderEvents from '../hooks/useOrderEvents';
import { isIos, isStandalone, isPushSupported, getPushSubscription, enablePush, syncPush, disablePush } from '../services/push';
import { unlockAudio, isAudioUnlocked, playChime, vibrate, requestWakeLock } from '../utils/stationAlerts';

// Anything that is not a shot (creamy/curated blends) is made at the blends station
const isShotItem = (item) => item.productCategory === 'SHOT';
const isBlendItem = (item) => item.productCategory !== 'SHOT';

const STATIONS = {
    ALL: { label: '📋 All Orders' },
    SHOT: { label: '⚡ Shots', name: 'Shots', icon: '⚡', statusKey: 'shotStatus', doneAtKey: 'shotCompletedAt', isItem: isShotItem },
    BLEND: { label: '🥤 Blends', name: 'Blends', icon: '🥤', statusKey: 'blendStatus', doneAtKey: 'blendCompletedAt', isItem: isBlendItem },
};
const STATION_KEY = 'orderQueueStation';
// Branch an admin is watching; admins belong to no branch and pick one per device
const QUEUE_SHOP_KEY = 'orderQueueShop';
const ALERTS_KEY = 'orderQueueAlerts';
// An order waiting longer than this at a station gets a reminder
const REMINDER_MINUTES = 5;
// New cards stay highlighted this long
const NEW_HIGHLIGHT_MS = 15000;
// Re-check waiting times locally (no network), so reminders and "x min" stay current
// even when nothing changes on the server
const CLOCK_TICK_MS = 15000;
// Backup refresh: frequent without the live stream, occasional with it
const POLL_MS = 5000;
const LIVE_POLL_MS = 60000;

const loadAlertsOn = () => {
    try {
        return localStorage.getItem(ALERTS_KEY) !== 'off';
    } catch (_) {
        return true;
    }
};

const stationQueue = (orders, key) => key === 'ALL'
    ? orders
    : orders.filter(o => o[STATIONS[key].statusKey] === 'PENDING');

const minutesWaiting = (order) => Math.max(0, Math.floor((Date.now() - parseServerTime(order.orderDate)) / 60000));

const loadQueueShop = () => {
    try {
        return localStorage.getItem(QUEUE_SHOP_KEY) || '';
    } catch (_) {
        return '';
    }
};

// Each device remembers its station (e.g. the shots counter tablet)
const loadStation = () => {
    try {
        const saved = localStorage.getItem(STATION_KEY);
        return STATIONS[saved] ? saved : 'ALL';
    } catch (_) {
        return 'ALL';
    }
};

// The server sends shop-local (IST) times without an offset; read them as IST so the
// clock and wait times are right whatever timezone the tablet is set to
const parseServerTime = (date) => {
    const s = String(date).replace(' ', 'T');
    return new Date(/([zZ]|[+-]\d\d:?\d\d)$/.test(s) ? s : `${s}+05:30`);
};
const formatTime = (date) => parseServerTime(date)
    .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const itemLabel = (item) => `${item.quantity}× ${item.customization || item.productName}`;

const StationBadge = ({ station, order }) => {
    const status = order[STATIONS[station].statusKey];
    if (status === 'NOT_REQUIRED') return null;
    return (
        <span className={`badge ${status === 'DONE' ? 'badge-success' : 'badge-warning'} queue-station-badge`}>
            {STATIONS[station].icon} {STATIONS[station].name} {status === 'DONE' ? '✓' : '⏳'}
        </span>
    );
};

const OrderQueuePage = () => {
    const { user } = useAuth();
    const [pendingOrders, setPendingOrders] = useState([]);
    const [todayOrders, setTodayOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(null);
    const [chosenStation, setChosenStation] = useState(loadStation);
    // Operators with an assigned station only see that queue; refreshed with each poll
    // so an admin's change applies without logging out
    const [assignedStation, setAssignedStation] = useState(user?.role === 'SHOP_OPERATOR' ? user?.station || null : null);
    const station = assignedStation || chosenStation;
    const [alertsOn, setAlertsOn] = useState(loadAlertsOn);
    const [audioReady, setAudioReady] = useState(isAudioUnlocked);
    // Order ids already seen in the current station's queue; null station means not seeded yet
    const seenRef = useRef({ key: null, ids: new Set() });
    const remindedRef = useRef(new Set());
    const [newUntil, setNewUntil] = useState(() => new Map());

    // Live events and polling can overlap; only the newest response is applied
    const isAdmin = user?.role === 'SUPER_ADMIN';
    const [shops, setShops] = useState([]);
    const [adminShopId, setAdminShopId] = useState(loadQueueShop);
    useEffect(() => {
        if (!isAdmin) return;
        adminService.getShops()
            .then(res => {
                const active = (res.data.data || []).filter(s => s.active);
                setShops(active);
                // Keep the saved branch if it still exists, else the first active one
                setAdminShopId(prev => (active.some(s => String(s.id) === String(prev)) ? prev : String(active[0]?.id || '')));
            })
            .catch(() => toast.error('Failed to load branches'));
    }, [isAdmin]);
    const queueShopId = isAdmin ? adminShopId : user?.shopId;
    const shopReady = !isAdmin || !!queueShopId;

    const selectShop = (id) => {
        // Loading ends when the new branch's orders arrive, so only a real change may start it
        if (String(id) === String(adminShopId)) return;
        setAdminShopId(id);
        setLoading(true);
        try { localStorage.setItem(QUEUE_SHOP_KEY, id); } catch (_) { /* not persisted */ }
    };

    // The branch the loaded orders belong to (lags the selection until they arrive)
    const [ordersShop, setOrdersShop] = useState(null);
    const requestSeq = useRef(0);
    const fetchOrders = useCallback(async () => {
        if (!shopReady) return;
        const seq = ++requestSeq.current;
        try {
            const [pendingRes, todayRes, stationRes] = await Promise.all([
                orderService.getPendingOrders(queueShopId),
                orderService.getHandedOverToday(queueShopId),
                orderService.getMyStation().catch(() => null),
            ]);
            if (seq !== requestSeq.current) return;
            setOrdersShop(String(queueShopId));
            setPendingOrders(pendingRes.data.data || []);
            setTodayOrders(todayRes.data.data || []);
            if (stationRes) setAssignedStation(stationRes.data.data?.station || null);
        } catch (err) {
            toast.error('Failed to load orders');
        } finally {
            // A superseded response must not end loading: the alert logic would see an
            // empty queue and then treat every existing order as new
            if (seq === requestSeq.current) setLoading(false);
        }
    }, [queueShopId, shopReady]);

    // Live events from the server reload the queue instantly; polling is the backup
    const live = useOrderEvents(queueShopId, fetchOrders, shopReady);
    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, live ? LIVE_POLL_MS : POLL_MS);
        return () => clearInterval(interval);
    }, [fetchOrders, live]);

    const [clock, setClock] = useState(Date.now);
    useEffect(() => {
        const timer = setInterval(() => setClock(Date.now()), CLOCK_TICK_MS);
        return () => clearInterval(timer);
    }, []);

    // Compare each refresh with the previous one and alert on orders new to this station;
    // also re-runs on each clock tick to catch orders crossing the reminder time
    useEffect(() => {
        if (loading) return;
        const queue = stationQueue(pendingOrders, station);
        const seen = seenRef.current;
        const key = `${ordersShop}:${station}`;
        seenRef.current = { key, ids: new Set(queue.map(o => o.id)) };
        // First load, or a station or branch switch: just remember what is there, no alert flood
        if (seen.key !== key) return;

        const now = Date.now();
        const fresh = queue.filter(o => !seen.ids.has(o.id));
        if (fresh.length > 0) {
            setNewUntil(prev => {
                const next = new Map([...prev].filter(([, until]) => until > now));
                fresh.forEach(o => next.set(o.id, now + NEW_HIGHLIGHT_MS));
                return next;
            });
        }

        // Once per order, even if the view is switched
        const overdue = queue.filter(o => minutesWaiting(o) >= REMINDER_MINUTES && !remindedRef.current.has(o.id));
        overdue.forEach(o => remindedRef.current.add(o.id));

        if (!alertsOn) return;
        const stationItems = (o) => (o.items || []).filter(station === 'ALL' ? () => true : STATIONS[station].isItem);
        if (fresh.length > 0) {
            playChime(station);
            vibrate();
            fresh.forEach(o => toast(
                `🔔 New order #${o.tokenNumber}: ${stationItems(o).map(itemLabel).join(', ')}${o.parcel ? ' · 🛍️ Parcel' : ''}`,
                { duration: 8000 }
            ));
        } else if (overdue.length > 0) {
            playChime('REMINDER');
            vibrate([400]);
        }
        if (overdue.length > 0) {
            toast(`⏰ Waiting over ${REMINDER_MINUTES} min: ${overdue.map(o => `#${o.tokenNumber}`).join(', ')}`,
                { duration: 8000, icon: '⏰' });
        }
    }, [pendingOrders, ordersShop, station, loading, alertsOn, clock]);

    // Browsers block sound until the page is touched; the first tap anywhere unlocks it.
    // Uses click, not pointerdown: removing the banner mid-tap would shift the page and
    // make the tap land on a different button.
    useEffect(() => {
        if (audioReady) return;
        const unlock = () => unlockAudio().then(setAudioReady);
        document.addEventListener('click', unlock);
        return () => document.removeEventListener('click', unlock);
    }, [audioReady]);

    // Keep the station screen on while alerts are on; the lock drops when the tab is hidden
    useEffect(() => {
        if (!alertsOn) return;
        let lock = null;
        let active = true;
        const acquire = async () => {
            if (document.visibilityState !== 'visible') return;
            const next = await requestWakeLock();
            if (active) lock = next;
            else if (next) next.release().catch(() => {});
        };
        acquire();
        document.addEventListener('visibilitychange', acquire);
        return () => {
            active = false;
            document.removeEventListener('visibilitychange', acquire);
            if (lock) lock.release().catch(() => {});
        };
    }, [alertsOn]);

    // Pending count in the tab title, restored when leaving the page
    const queueCount = stationQueue(pendingOrders, station).length;
    useEffect(() => {
        const original = document.title;
        return () => { document.title = original; };
    }, []);
    useEffect(() => {
        document.title = queueCount > 0 ? `(${queueCount}) Order Queue` : 'Order Queue';
    }, [queueCount]);

    // Phone notifications (work with the app closed or the device locked)
    const [pushOn, setPushOn] = useState(false);
    const [pushBusy, setPushBusy] = useState(false);
    useEffect(() => {
        getPushSubscription()
            .then(sub => setPushOn(!!sub))
            .catch(() => {});
    }, []);
    // The server sends this device the orders of the station view it shows
    useEffect(() => {
        if (pushOn && shopReady) syncPush(station, queueShopId).catch(() => {});
    }, [pushOn, station, queueShopId, shopReady]);

    const togglePush = async () => {
        setPushBusy(true);
        try {
            if (pushOn) {
                await disablePush();
                setPushOn(false);
                toast.success('Phone notifications off for this device');
            } else {
                await enablePush(station, queueShopId);
                setPushOn(true);
                toast.success('Phone notifications on for this device');
            }
        } catch (err) {
            toast.error(Notification.permission === 'denied'
                ? 'Notifications are blocked. Allow them for this app in the browser or device settings.'
                : (err.response?.data?.message || err.message || 'Could not change phone notifications'));
        } finally {
            setPushBusy(false);
        }
    };

    const toggleAlerts = () => {
        const next = !alertsOn;
        setAlertsOn(next);
        try { localStorage.setItem(ALERTS_KEY, next ? 'on' : 'off'); } catch (_) { /* not persisted */ }
        if (next) unlockAudio().then(setAudioReady);
    };

    const selectStation = (key) => {
        setChosenStation(key);
        try { localStorage.setItem(STATION_KEY, key); } catch (_) { /* not persisted */ }
    };

    const handleComplete = async (order) => {
        setCompleting(order.id);
        try {
            if (station === 'ALL') {
                await orderService.completeOrder(order.id);
                toast.success(`Order #${order.tokenNumber} delivered!`);
            } else {
                const res = await orderService.completeStation(order.id, station);
                const updated = res.data.data;
                if (updated?.status === 'COMPLETED') {
                    toast.success(`Order #${order.tokenNumber} delivered!`);
                } else {
                    const other = station === 'SHOT' ? 'BLEND' : 'SHOT';
                    toast.success(`${STATIONS[station].name} done for #${order.tokenNumber}, waiting for ${STATIONS[other].name.toLowerCase()}`);
                }
            }
            fetchOrders();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to mark as delivered');
            fetchOrders();
        } finally {
            setCompleting(null);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const config = STATIONS[station];
    const isStationView = station !== 'ALL';
    const queueFor = (key) => stationQueue(pendingOrders, key);
    const queue = queueFor(station);

    // Handed over today (including left-over orders from earlier days), most recent first, limit 20
    const today = getISTDateString();
    const doneAt = (o) => isStationView
        ? o[config.doneAtKey]
        : [o.shotCompletedAt, o.blendCompletedAt].filter(Boolean).sort().pop();
    const doneList = (isStationView
        ? todayOrders.filter(o => o[config.doneAtKey] && getBusinessDateOf(o[config.doneAtKey]) === today)
        : todayOrders.filter(o => o.status === 'COMPLETED' && getBusinessDateOf(doneAt(o)) === today)
    ).sort((a, b) => parseServerTime(doneAt(b)) - parseServerTime(doneAt(a))).slice(0, 20);

    const visibleItems = (order) => isStationView ? (order.items || []).filter(config.isItem) : (order.items || []);
    const currentToken = queue.length > 0 ? queue[0].tokenNumber : null;
    const lastDone = doneList.length > 0 ? doneList[0].tokenNumber : null;
    const otherStation = station === 'SHOT' ? 'BLEND' : 'SHOT';

    return (
        <div>
            <div className="page-header">
                <h1>📋 Order Queue</h1>
                <div className="queue-header-actions">
                    <span className={`badge ${live ? 'badge-success' : 'badge-warning'} queue-live-badge`}
                        title={live ? 'Updates arrive instantly' : 'Reconnecting; refreshing every 5 seconds meanwhile'}>
                        {live ? '● Live' : '○ Reconnecting'}
                    </span>
                    {isPushSupported() && (
                        <button className={`btn ${pushOn ? 'btn-primary' : 'btn-outline'}`} onClick={togglePush} disabled={pushBusy}
                            title="Notifications on this device even when the app is closed or the screen is locked">
                            {pushOn ? '📱 Phone Alerts On' : '📱 Phone Alerts Off'}
                        </button>
                    )}
                    <button className={`btn ${alertsOn ? 'btn-primary' : 'btn-outline'}`} onClick={toggleAlerts}>
                        {alertsOn ? '🔔 Screen Alerts On' : '🔕 Screen Alerts Off'}
                    </button>
                    <button className="btn btn-outline" onClick={() => { setLoading(true); fetchOrders(); }}>
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {!isPushSupported() && isIos() && !isStandalone() && (
                <p className="form-hint queue-push-hint">
                    📱 For phone alerts on iPad/iPhone: tap Share → <strong>Add to Home Screen</strong>, then open 3Monks from the home screen icon.
                </p>
            )}

            {alertsOn && !audioReady && (
                <button className="btn btn-lg queue-alert-banner" onClick={() => unlockAudio().then(setAudioReady)}>
                    🔔 Tap here to enable sound alerts
                </button>
            )}

            {isAdmin && (
                <div className="queue-branch">
                    <label htmlFor="queue-branch">Branch</label>
                    <select id="queue-branch" className="form-control" value={adminShopId} onChange={e => selectShop(e.target.value)}>
                        {shops.length === 0 && <option value="">No active branches</option>}
                        {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            )}

            {/* Station selector; operators assigned to a station are kept on it */}
            <div className="queue-filter">
                {assignedStation ? (
                    <span className="queue-assigned-station">
                        {STATIONS[assignedStation].label} station ({queue.length})
                    </span>
                ) : Object.entries(STATIONS).map(([key, s]) => (
                    <button
                        key={key}
                        className={`btn btn-sm ${station === key ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => selectStation(key)}
                    >
                        {s.label} ({queueFor(key).length})
                    </button>
                ))}
            </div>

            {/* Token Counter Display */}
            <div className="queue-token-display">
                <div className="queue-token-card queue-token-now">
                    <div className="queue-token-label">Now Serving</div>
                    <div className="queue-token-number">{currentToken ? `#${currentToken}` : '—'}</div>
                </div>
                <div className="queue-token-card queue-token-last">
                    <div className="queue-token-label">{isStationView ? 'Last Handed Over' : 'Last Delivered'}</div>
                    <div className="queue-token-number">{lastDone ? `#${lastDone}` : '—'}</div>
                </div>
                <div className="queue-token-card queue-token-pending">
                    <div className="queue-token-label">In Queue</div>
                    <div className="queue-token-number">{queue.length}</div>
                </div>
            </div>

            {/* Pending Orders */}
            <div className="queue-section">
                <h3 className="queue-section-title">
                    ⏳ {isStationView ? `${config.name} Queue` : 'Pending Orders'} ({queue.length})
                </h3>
                {queue.length === 0 ? (
                    <div className="queue-empty">
                        <span className="queue-empty-icon">✅</span>
                        <p>{isStationView ? `No pending ${config.name.toLowerCase()}!` : 'All orders delivered!'}</p>
                    </div>
                ) : (
                    <div className="queue-grid">
                        {queue.map((order, index) => {
                            const waited = minutesWaiting(order);
                            const overdue = waited >= REMINDER_MINUTES;
                            // Left over from an earlier day: stays until completed or cancelled
                            const earlier = isFromEarlierDay(order);
                            const isNew = (newUntil.get(order.id) || 0) > Date.now();
                            return (
                            <div
                                key={order.id}
                                className={`queue-card ${index === 0 ? 'queue-card-active' : ''} ${isNew ? 'queue-card-new' : ''} ${overdue ? 'queue-card-overdue' : ''}`}
                            >
                                <div className="queue-card-header">
                                    <span className="queue-card-token">
                                        #{order.tokenNumber}
                                        {order.parcel && <span className="badge badge-warning queue-parcel-badge">🛍️ Parcel</span>}
                                    </span>
                                    <span className="queue-card-time">
                                        {isNew && <span className="badge badge-success queue-new-badge">NEW</span>}
                                        {earlier && (
                                            <span className="badge badge-danger queue-earlier-badge">📅 From {formatShortDate(order.businessDate)}</span>
                                        )}
                                        {formatTime(order.orderDate)}
                                        {!earlier && (
                                            <span className={`queue-wait ${overdue ? 'queue-wait-overdue' : ''}`}>
                                                {overdue ? '⏰ ' : ''}{waited} min
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="queue-card-items">
                                    {visibleItems(order).map((item, i) => (
                                        <div key={i} className="queue-card-item">
                                            <span>{itemLabel(item)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="queue-card-stations">
                                    {isStationView
                                        ? <StationBadge station={otherStation} order={order} />
                                        : <><StationBadge station="SHOT" order={order} /><StationBadge station="BLEND" order={order} /></>}
                                </div>
                                {order.customerName && (
                                    <div className="queue-card-customer">👤 {order.customerName}</div>
                                )}
                                <div className="queue-card-footer">
                                    <span className="queue-card-total">{formatCurrency(order.totalAmount)}</span>
                                    <span className={`badge ${order.paymentMode === 'CASH' ? 'badge-warning' : 'badge-primary'}`}>
                                        {order.paymentMode === 'CASH' ? '💵' : '📱'} {order.paymentMode}
                                    </span>
                                </div>
                                <button
                                    className="btn btn-primary queue-deliver-btn"
                                    onClick={() => handleComplete(order)}
                                    disabled={completing === order.id}
                                >
                                    {completing === order.id
                                        ? '⏳ Processing...'
                                        : isStationView ? `✅ ${config.name} Handed Over` : '✅ Complete Whole Order'}
                                </button>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Recently Completed */}
            {doneList.length > 0 && (
                <div className="queue-section">
                    <h3 className="queue-section-title">
                        ✅ {isStationView ? `Recently Handed Over (${config.name})` : 'Recently Delivered'}
                    </h3>
                    <div className="queue-completed-list">
                        {doneList.map(order => (
                            <div key={order.id} className="queue-completed-item">
                                <span className="queue-completed-token">
                                    #{order.tokenNumber}
                                    {isFromEarlierDay(order) && (
                                        <span className="badge badge-danger queue-earlier-badge">📅 From {formatShortDate(order.businessDate)}</span>
                                    )}
                                </span>
                                <span className="queue-completed-items">
                                    {visibleItems(order).map(itemLabel).join(', ')}
                                </span>
                                <span className="queue-completed-total">{formatCurrency(order.totalAmount)}</span>
                                <span className="queue-completed-time">
                                    {formatTime(isStationView ? order[config.doneAtKey] : order.orderDate)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderQueuePage;
