import React, { useState, useEffect } from 'react';
import { adminService } from '../services/dataService';
import toast from 'react-hot-toast';

const FranchiseEnquiriesPage = () => {
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchEnquiries = async () => {
        try {
            const res = await adminService.getFranchiseEnquiries();
            setEnquiries(res.data.data || []);
        } catch {
            toast.error('Failed to load enquiries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEnquiries(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this enquiry?')) return;
        try {
            await adminService.deleteFranchiseEnquiry(id);
            toast.success('Enquiry deleted');
            fetchEnquiries();
        } catch {
            toast.error('Failed to delete');
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Franchise Enquiries</h1>
                <div className="stat-badge" style={{ background: 'rgba(168,85,247,0.1)', padding: '8px 16px', borderRadius: '8px', color: '#a855f7', fontWeight: 600 }}>
                    {enquiries.length} Total
                </div>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : enquiries.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏪</div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No enquiries yet</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Franchise enquiries will appear here once submitted.</p>
                </div>
            ) : (
                <div className="card">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>City</th>
                                    <th>Message</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enquiries.map(enq => (
                                    <tr key={enq.id}>
                                        <td style={{ fontWeight: 600 }}>{enq.name}</td>
                                        <td>
                                            <a href={`mailto:${enq.email}`} style={{ color: '#a855f7' }}>{enq.email}</a>
                                        </td>
                                        <td>
                                            <a href={`tel:${enq.phone}`} style={{ color: '#a855f7' }}>{enq.phone}</a>
                                        </td>
                                        <td>{enq.city}</td>
                                        <td style={{ maxWidth: '350px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {enq.message || '—'}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                            {new Date(enq.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleDelete(enq.id)}
                                                className="btn btn-sm"
                                                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                            >
                                                Delete
                                            </button>
                                        </td>
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

export default FranchiseEnquiriesPage;
