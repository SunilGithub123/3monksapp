import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/dataService';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

// Anything that is not a shot (creamy/curated blends) is made at the blends station
const isShotItem = (item) => item.productCategory === 'SHOT';
const isBlendItem = (item) => item.productCategory !== 'SHOT';

const STATIONS = {
    ALL: { label: '📋 All Orders' },
    SHOT: { label: '⚡ Shots', name: 'Shots', icon: '⚡', statusKey: 'shotStatus', doneAtKey: 'shotCompletedAt', isItem: isShotItem },
    BLEND: { label: '🥤 Blends', name: 'Blends', icon: '🥤', statusKey: 'blendStatus', doneAtKey: 'blendCompletedAt', isItem: isBlendItem },
};
const STATION_KEY = 'orderQueueStation';

// Each device remembers its station (e.g. the shots counter tablet)
const loadStation = () => {
    try {
        const saved = localStorage.getItem(STATION_KEY);
        return STATIONS[saved] ? saved : 'ALL';
    } catch (_) {
        return 'ALL';
    }
};

const formatTime = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
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
    const [station, setStation] = useState(loadStation);

    const fetchOrders = useCallback(async () => {
        try {
            const [pendingRes, todayRes] = await Promise.all([
                orderService.getPendingOrders(user?.shopId),
                orderService.getTodayOrders(user?.shopId),
            ]);
            setPendingOrders(pendingRes.data.data || []);
            setTodayOrders(todayRes.data.data || []);
        } catch (err) {
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, [user?.shopId]);

    useEffect(() => {
        fetchOrders();
        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    const selectStation = (key) => {
        setStation(key);
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
    const queueFor = (key) => key === 'ALL'
        ? pendingOrders
        : pendingOrders.filter(o => o[STATIONS[key].statusKey] === 'PENDING');
    const queue = queueFor(station);

    // Most recent first, limit 20
    const doneList = (isStationView
        ? todayOrders
            .filter(o => o[config.doneAtKey])
            .sort((a, b) => new Date(b[config.doneAtKey]) - new Date(a[config.doneAtKey]))
        : todayOrders.filter(o => o.status === 'COMPLETED')
    ).slice(0, 20);

    const visibleItems = (order) => isStationView ? (order.items || []).filter(config.isItem) : (order.items || []);
    const currentToken = queue.length > 0 ? queue[0].tokenNumber : null;
    const lastDone = doneList.length > 0 ? doneList[0].tokenNumber : null;
    const otherStation = station === 'SHOT' ? 'BLEND' : 'SHOT';

    return (
        <div>
            <div className="page-header">
                <h1>📋 Order Queue</h1>
                <button className="btn btn-outline" onClick={() => { setLoading(true); fetchOrders(); }}>
                    🔄 Refresh
                </button>
            </div>

            {/* Station selector */}
            <div className="queue-filter">
                {Object.entries(STATIONS).map(([key, s]) => (
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
                        {queue.map((order, index) => (
                            <div key={order.id} className={`queue-card ${index === 0 ? 'queue-card-active' : ''}`}>
                                <div className="queue-card-header">
                                    <span className="queue-card-token">
                                        #{order.tokenNumber}
                                        {order.parcel && <span className="badge badge-warning queue-parcel-badge">🛍️ Parcel</span>}
                                    </span>
                                    <span className="queue-card-time">{formatTime(order.orderDate)}</span>
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
                        ))}
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
                                <span className="queue-completed-token">#{order.tokenNumber}</span>
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
