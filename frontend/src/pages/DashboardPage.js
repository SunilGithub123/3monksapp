import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dataService';
import { formatCurrency } from '../utils/helpers';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const DashboardPage = () => {
    const { user, isAdmin, isManager } = useAuth();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []); // eslint-disable-line

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            let res;
            if (isAdmin()) {
                res = await dashboardService.getAdminDashboard();
            } else if (isManager()) {
                res = await dashboardService.getShopDashboard(user.shopId);
            } else {
                setLoading(false);
                return;
            }
            setDashboard(res.data.data);
        } catch (err) {
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    // Operator view
    if (!isAdmin() && !isManager()) {
        return (
            <div>
                <div className="page-header"><h1>Welcome, {user?.fullName}</h1></div>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Your Shop</div>
                        <div className="stat-value" style={{ fontSize: '20px' }}>{user?.shopName || 'N/A'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Role</div>
                        <div className="stat-value" style={{ fontSize: '20px' }}>Shop Operator</div>
                    </div>
                </div>
                <div className="card">
                    <h3>Quick Actions</h3>
                    <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>Use the sidebar to create new orders or view today's orders.</p>
                </div>
            </div>
        );
    }

    if (!dashboard) return <div className="empty-state"><div className="icon">📊</div><p>No data available</p></div>;

    const barData = {
        labels: Object.keys(dashboard.monthlySales || {}),
        datasets: [{
            label: 'Sales',
            data: Object.values(dashboard.monthlySales || {}),
            backgroundColor: 'rgba(124, 58, 237, 0.7)',
            borderRadius: 6,
        }],
    };

    const topProductData = {
        labels: (dashboard.topProducts || []).slice(0, 5).map(p => p.productName),
        datasets: [{
            data: (dashboard.topProducts || []).slice(0, 5).map(p => p.totalQuantity),
            backgroundColor: ['#7c3aed', '#9333ea', '#a855f7', '#c084fc', '#fbbf24'],
        }],
    };

    return (
        <div>
            <div className="page-header">
                <h1>{isAdmin() ? 'Admin Dashboard' : 'Shop Dashboard'}</h1>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Sales</div>
                    <div className="stat-value">{formatCurrency(dashboard.totalSales)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Orders</div>
                    <div className="stat-value">{dashboard.totalOrders}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Cost</div>
                    <div className="stat-value">{formatCurrency(dashboard.totalCost)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Profit</div>
                    <div className="stat-value" style={{ color: dashboard.totalProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {formatCurrency(dashboard.totalProfit)}
                    </div>
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <h3 style={{ marginBottom: '16px' }}>Monthly Sales</h3>
                    <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                </div>
                <div className="card">
                    <h3 style={{ marginBottom: '16px' }}>Top Products</h3>
                    {dashboard.topProducts?.length > 0 ? (
                        <Doughnut data={topProductData} options={{ responsive: true }} />
                    ) : (
                        <p style={{ color: 'var(--text-light)' }}>No product data yet</p>
                    )}
                </div>
            </div>

            {isAdmin() && dashboard.salesPerShop?.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: '16px' }}>Sales by Shop</h3>
                    <div className="table-wrapper">
                        <table>
                            <thead><tr><th>Shop</th><th>Orders</th><th>Sales</th></tr></thead>
                            <tbody>
                                {dashboard.salesPerShop.map(shop => (
                                    <tr key={shop.shopId}>
                                        <td>{shop.shopName}</td>
                                        <td>{shop.orderCount}</td>
                                        <td>{formatCurrency(shop.totalSales)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {dashboard.lowStockAlerts?.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: '16px', color: 'var(--danger)' }}>⚠️ Low Stock Alerts</h3>
                    <div className="table-wrapper">
                        <table>
                            <thead><tr><th>Shop</th><th>Material</th><th>Current</th><th>Threshold</th></tr></thead>
                            <tbody>
                                {dashboard.lowStockAlerts.map((alert, i) => (
                                    <tr key={i}>
                                        <td>{alert.shopName}</td>
                                        <td>{alert.rawMaterialName}</td>
                                        <td><span className="badge badge-danger">{alert.currentQuantity}</span></td>
                                        <td>{alert.threshold}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
