import React, { useState, useEffect } from 'react';
import { adminService } from '../services/dataService';
import toast from 'react-hot-toast';

const FeedbacksPage = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFeedbacks = async () => {
        try {
            const res = await adminService.getFeedbacks();
            setFeedbacks(res.data.data || []);
        } catch {
            toast.error('Failed to load feedbacks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFeedbacks(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this feedback?')) return;
        try {
            await adminService.deleteFeedback(id);
            toast.success('Feedback deleted');
            fetchFeedbacks();
        } catch {
            toast.error('Failed to delete');
        }
    };

    const renderStars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

    const avgRating = feedbacks.length > 0
        ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
        : '0.0';

    return (
        <div>
            <div className="page-header">
                <h1>Customer Feedbacks</h1>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="stat-badge" style={{ background: 'rgba(168,85,247,0.1)', padding: '8px 16px', borderRadius: '8px', color: '#a855f7', fontWeight: 600 }}>
                        {feedbacks.length} Total
                    </div>
                    <div className="stat-badge" style={{ background: 'rgba(251,191,36,0.1)', padding: '8px 16px', borderRadius: '8px', color: '#fbbf24', fontWeight: 600 }}>
                        ★ {avgRating} Avg
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : feedbacks.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No feedbacks yet</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Customer feedbacks will appear here once submitted.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {feedbacks.map(fb => (
                        <div key={fb.id} className="card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{fb.name}</div>
                                    <div style={{ color: '#fbbf24', fontSize: '1.2rem', letterSpacing: '2px', marginTop: '4px' }}>{renderStars(fb.rating)}</div>
                                </div>
                                <button
                                    onClick={() => handleDelete(fb.id)}
                                    className="btn btn-sm"
                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                    Delete
                                </button>
                            </div>
                            {fb.message && (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '12px', fontStyle: 'italic' }}>
                                    "{fb.message}"
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                {fb.email && <span>📧 {fb.email}</span>}
                                {fb.phone && <span>📱 {fb.phone}</span>}
                                <span>🕐 {new Date(fb.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FeedbacksPage;
