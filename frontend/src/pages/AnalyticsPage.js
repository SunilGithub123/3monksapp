import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/dataService';
import { formatCurrency, getISTDateString } from '../utils/helpers';
import { Bar, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';

const AnalyticsPage = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [from, setFrom] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    });
    const [to, setTo] = useState(() => getISTDateString());

    useEffect(() => { fetchAnalytics(); }, []); // eslint-disable-line

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await dashboardService.getAnalytics(from, to);
            setAnalytics(res.data.data);
        } catch (err) { toast.error('Failed to load analytics'); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;
    if (!analytics) return <div className="empty-state"><div className="icon">📊</div><p>No analytics data</p></div>;

    const { dailySales, productWiseSales, rawMaterialUsage, vendorWisePurchases, monthlyPnL, breakEven } = analytics;

    // Daily Sales Chart
    const dailySalesData = {
        labels: Object.keys(dailySales || {}).map(d => d.slice(5)),
        datasets: [{ label: 'Daily Sales (₹)', data: Object.values(dailySales || {}), backgroundColor: 'rgba(108, 99, 255, 0.7)', borderRadius: 4 }]
    };

    // Product Sales Doughnut
    const prodLabels = (productWiseSales || []).slice(0, 10).map(p => p.productName);
    const prodData = (productWiseSales || []).slice(0, 10).map(p => p.revenue);
    const colors = ['#6c63ff', '#f5c542', '#ff6b6b', '#51cf66', '#339af0', '#ff922b', '#845ef7', '#20c997', '#e64980', '#fab005'];
    const productChartData = {
        labels: prodLabels,
        datasets: [{ data: prodData, backgroundColor: colors.slice(0, prodLabels.length) }]
    };

    // Monthly P&L Chart
    const pnlMonths = Object.keys(monthlyPnL || {});
    const pnlData = {
        labels: pnlMonths,
        datasets: [
            { label: 'Revenue', data: pnlMonths.map(m => monthlyPnL[m]?.revenue || 0), backgroundColor: 'rgba(81, 207, 102, 0.7)', borderRadius: 4 },
            { label: 'Cost', data: pnlMonths.map(m => monthlyPnL[m]?.cost || 0), backgroundColor: 'rgba(255, 107, 107, 0.7)', borderRadius: 4 },
            { label: 'Profit', data: pnlMonths.map(m => monthlyPnL[m]?.profit || 0), backgroundColor: 'rgba(108, 99, 255, 0.7)', borderRadius: 4 },
        ]
    };

    const chartOptions = { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } };

    return (
        <div>
            <div className="page-header">
                <h1>Analytics Dashboard</h1>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="date" className="form-control" value={from} onChange={e => setFrom(e.target.value)} style={{ width: '150px' }} />
                    <span>to</span>
                    <input type="date" className="form-control" value={to} onChange={e => setTo(e.target.value)} style={{ width: '150px' }} />
                    <button className="btn btn-primary" onClick={fetchAnalytics}>Apply</button>
                </div>
            </div>

            {/* Break-Even Summary Cards */}
            {breakEven && (
                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div className="card stat-card"><div className="stat-label">Total Revenue</div><div className="stat-value">{formatCurrency(breakEven.totalRevenue)}</div></div>
                    <div className="card stat-card"><div className="stat-label">Fixed Cost (Salaries)</div><div className="stat-value">{formatCurrency(breakEven.totalFixedCost)}</div></div>
                    <div className="card stat-card"><div className="stat-label">Variable Cost</div><div className="stat-value">{formatCurrency(breakEven.totalVariableCost)}</div></div>
                    <div className="card stat-card"><div className="stat-label">Break-Even Point</div><div className="stat-value">{formatCurrency(breakEven.breakEvenRevenue)}</div></div>
                    <div className="card stat-card">
                        <div className="stat-label">Status</div>
                        <div className="stat-value">
                            <span className={`badge ${breakEven.isAboveBreakEven ? 'badge-success' : 'badge-danger'}`}>
                                {breakEven.isAboveBreakEven ? 'Profitable' : 'Below Break-Even'}
                            </span>
                        </div>
                    </div>
                    <div className="card stat-card"><div className="stat-label">Margin</div><div className="stat-value" style={{ color: breakEven.margin >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(breakEven.margin)}</div></div>
                </div>
            )}

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="card"><h3>Daily Sales</h3><Bar data={dailySalesData} options={chartOptions} /></div>
                <div className="card"><h3>Product-wise Revenue</h3><Doughnut data={productChartData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }} /></div>
            </div>

            {/* Monthly P&L Chart */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3>Monthly P&L</h3>
                <Bar data={pnlData} options={chartOptions} />
            </div>

            {/* Product-wise Sales Table */}
            {productWiseSales?.length > 0 && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3>Product-wise Sales</h3>
                    <div className="table-wrapper">
                        <table>
                            <thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
                            <tbody>{productWiseSales.map((p, i) => (
                                <tr key={i}><td style={{ fontWeight: 500 }}>{p.productName}</td><td>{p.quantity}</td><td>{formatCurrency(p.revenue)}</td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Raw Material Usage */}
            {rawMaterialUsage?.length > 0 && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3>Raw Material Usage</h3>
                    <div className="table-wrapper">
                        <table>
                            <thead><tr><th>Material</th><th>Unit</th><th>Consumed</th><th>Current Stock</th><th>Reorder Level</th><th>Status</th></tr></thead>
                            <tbody>{rawMaterialUsage.map((m, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 500 }}>{m.materialName}</td>
                                    <td>{m.unitType}</td>
                                    <td>{m.totalConsumed}</td>
                                    <td>{m.currentStock}</td>
                                    <td>{m.reorderLevel || '-'}</td>
                                    <td><span className={`badge ${m.lowStock ? 'badge-danger' : 'badge-success'}`}>{m.lowStock ? 'LOW' : 'OK'}</span></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Vendor-wise Purchases */}
            {vendorWisePurchases?.length > 0 && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3>Vendor-wise Purchases</h3>
                    <div className="table-wrapper">
                        <table>
                            <thead><tr><th>Vendor</th><th>Purchases</th><th>Total Qty</th><th>Total Cost</th></tr></thead>
                            <tbody>{vendorWisePurchases.map((v, i) => (
                                <tr key={i}><td style={{ fontWeight: 500 }}>{v.vendorName}</td><td>{v.purchaseCount}</td><td>{v.totalQuantity}</td><td>{formatCurrency(v.totalCost)}</td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;
