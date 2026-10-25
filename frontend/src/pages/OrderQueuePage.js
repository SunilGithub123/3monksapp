import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/dataService';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const FILTERS = [
    { key: 'ALL', label: 'All' },
    { key: 'SHOT', label: '⚡ Shots' },
    { key: 'BLEND', label: '🥤 Blends' },
];

const isShotItem = (item) => item.productCategory === 'SHOT';
const isBlendItem = (item) => item.productCategory === 'CREAMY_BLEND' || item.productCategory === 'CURATED_BLEND';

// An order matches a filter if it contains at least one item of that type
const matchesFilter = (order, filter) => {
    if (filter === 'ALL') return true;
    const check = filter === 'SHOT' ? isShotItem : isBlendItem;
    return (order.items || []).some(check);
};

const OrderQueuePage = () => {
    const { user } = useAuth();
    const [pendingOrders, setPendingOrders] = useState([]);
    const [completedOrders, setCompletedOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(null);
    const [filter, setFilter] = useState('ALL');

    const fetchOrders = useCallback(async () => {
        try {
            const [pendingRes, todayRes] = await Promise.all([
                orderService.getPendingOrders(user?.shopId),
                orderService.getTodayOrders(user?.shopId),
            ]);
            setPendingOrders(pendingRes.data.data || []);
            // Filter today's completed orders (most recent first, limit 20)
            const completed = (todayRes.data.data || [])
                .filter(o => o.status === 'COMPLETED')
                .slice(0, 20);
            setCompletedOrders(completed);
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

    const handleComplete = async (orderId) => {
        setCompleting(orderId);
        try {
            await orderService.completeOrder(orderId);
            toast.success('Order delivered!');
            fetchOrders();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to mark as delivered');
        } finally {
            setCompleting(null);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const currentToken = pendingOrders.length > 0 ? pendingOrders[0].tokenNumber : null;
    const lastCompleted = completedOrders.length > 0 ? completedOrders[0].tokenNumber : null;
    const filteredPending = pendingOrders.filter(o => matchesFilter(o, filter));
    const filteredCompleted = completedOrders.filter(o => matchesFilter(o, filter));
    const filterLabel = filter === 'SHOT' ? 'Shot ' : filter === 'BLEND' ? 'Blend ' : '';
    // In a filtered view, dim items that belong to the other station
    const isItemDimmed = (item) => filter !== 'ALL' && !(filter === 'SHOT' ? isShotItem(item) : isBlendItem(item));

    return (
        <div>
            <div className="page-header">
                <h1>📋 Order Queue</h1>
                <button className="btn btn-outline" onClick={() => { setLoading(true); fetchOrders(); }}>
                    🔄 Refresh
                </button>
            </div>

            {/* Token Counter Display */}
            <div className="queue-token-display">
                <div className="queue-token-card queue-token-now">
                    <div className="queue-token-label">Now Serving</div>
                    <div className="queue-token-number">{currentToken ? `#${currentToken}` : '—'}</div>
                </div>
                <div className="queue-token-card queue-token-last">
                    <div className="queue-token-label">Last Delivered</div>
                    <div className="queue-token-number">{lastCompleted ? `#${lastCompleted}` : '—'}</div>
                </div>
                <div className="queue-token-card queue-token-pending">
                    <div className="queue-token-label">In Queue</div>
                    <div className="queue-token-number">{pendingOrders.length}</div>
                </div>
            </div>

            {/* Order Type Filter */}
            <div className="queue-filter">
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setFilter(f.key)}
                    >
                        {f.label} ({pendingOrders.filter(o => matchesFilter(o, f.key)).length})
                    </button>
                ))}
            </div>

            {/* Pending Orders */}
            <div className="queue-section">
                <h3 className="queue-section-title">⏳ Pending {filterLabel}Orders ({filteredPending.length})</h3>
                {filteredPending.length === 0 ? (
                    <div className="queue-empty">
                        <span className="queue-empty-icon">✅</span>
                        <p>{filter === 'ALL' ? 'All orders delivered!' : `No pending ${filterLabel.toLowerCase()}orders`}</p>
                    </div>
                ) : (
                    <div className="queue-grid">
                        {filteredPending.map((order, index) => (
                            <div key={order.id} className={`queue-card ${index === 0 ? 'queue-card-active' : ''}`}>
                                <div className="queue-card-header">
                                    <span className="queue-card-token">
                                        #{order.tokenNumber}
                                        {order.parcel && <span className="badge badge-warning queue-parcel-badge">🛍️ Parcel</span>}
                                    </span>
                                    <span className="queue-card-time">
                                        {new Date(order.orderDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="queue-card-items">
                                    {order.items?.map((item, i) => (
                                        <div key={i} className={`queue-card-item ${isItemDimmed(item) ? 'queue-card-item-dimmed' : ''}`}>
                                            <span>{item.quantity}× {item.customization || item.productName}</span>
                                        </div>
                                    ))}
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
                                    onClick={() => handleComplete(order.id)}
                                    disabled={completing === order.id}
                                >
                                    {completing === order.id ? '⏳ Processing...' : '✅ Mark Delivered'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recently Completed */}
            {filteredCompleted.length > 0 && (
                <div className="queue-section">
                    <h3 className="queue-section-title">✅ Recently Delivered</h3>
                    <div className="queue-completed-list">
                        {filteredCompleted.map(order => (
                            <div key={order.id} className="queue-completed-item">
                                <span className="queue-completed-token">#{order.tokenNumber}</span>
                                <span className="queue-completed-items">
                                    {order.items?.map(i => `${i.quantity}× ${i.customization || i.productName}`).join(', ')}
                                </span>
                                <span className="queue-completed-total">{formatCurrency(order.totalAmount)}</span>
                                <span className="queue-completed-time">
                                    {new Date(order.orderDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
