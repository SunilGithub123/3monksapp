import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dataService';
import { formatCurrency, getISTDateString, getISTMonthString } from '../utils/helpers';
import toast from 'react-hot-toast';

const ReportsPage = () => {
    const { user, isAdmin } = useAuth();
    const [from, setFrom] = useState(getISTMonthString() + '-01');
    const [to, setTo] = useState(getISTDateString());
    const [profitLoss, setProfitLoss] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const shopId = isAdmin() ? null : user.shopId;
            const res = await dashboardService.getProfitLoss(shopId, from, to);
            setProfitLoss(res.data.data);
        } catch (err) {
            toast.error('Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header"><h1>Reports</h1></div>

            <div className="card">
                <h3 style={{ marginBottom: '16px' }}>Profit & Loss Report</h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>From</label>
                        <input type="date" className="form-control" value={from} onChange={e => setFrom(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>To</label>
                        <input type="date" className="form-control" value={to} onChange={e => setTo(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
                        {loading ? 'Loading...' : 'Generate Report'}
                    </button>
                </div>
            </div>

            {profitLoss && (
                <div>
                    <div className="stats-grid" style={{ marginTop: '24px' }}>
                        <div className="stat-card">
                            <div className="stat-label">Revenue</div>
                            <div className="stat-value">{formatCurrency(profitLoss.totalRevenue)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Cost</div>
                            <div className="stat-value">{formatCurrency(profitLoss.totalCost)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Profit</div>
                            <div className="stat-value" style={{ color: profitLoss.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {formatCurrency(profitLoss.profit)}
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Orders</div>
                            <div className="stat-value">{profitLoss.totalOrders}</div>
                        </div>
                    </div>

                    <div className="card">
                        <h3>Summary</h3>
                        <table style={{ marginTop: '12px' }}>
                            <tbody>
                                <tr><td style={{ fontWeight: 500 }}>Period</td><td>{profitLoss.fromDate} to {profitLoss.toDate}</td></tr>
                                <tr><td style={{ fontWeight: 500 }}>Shop</td><td>{profitLoss.shopName}</td></tr>
                                <tr><td style={{ fontWeight: 500 }}>Total Revenue</td><td>{formatCurrency(profitLoss.totalRevenue)}</td></tr>
                                <tr><td style={{ fontWeight: 500 }}>Total Cost</td><td>{formatCurrency(profitLoss.totalCost)}</td></tr>
                                <tr><td style={{ fontWeight: 500 }}>Net Profit</td><td style={{ color: profitLoss.profit >= 0 ? 'green' : 'red', fontWeight: 700 }}>{formatCurrency(profitLoss.profit)}</td></tr>
                                <tr><td style={{ fontWeight: 500 }}>Total Orders</td><td>{profitLoss.totalOrders}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
