import React, { useState } from 'react';
import { adminService } from '../services/dataService';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import { FiTrash2, FiAlertTriangle, FiShoppingCart, FiBox, FiPackage, FiMessageSquare, FiBriefcase, FiUserCheck } from 'react-icons/fi';

const resetCategories = [
    {
        key: 'orders',
        label: 'Orders & History',
        description: 'Delete all orders, order items, and order history',
        icon: <FiShoppingCart />,
        color: '#f44336',
        action: () => adminService.resetOrders(),
    },
    {
        key: 'purchases',
        label: 'Purchases',
        description: 'Delete all purchase records',
        icon: <FiBox />,
        color: '#ff9800',
        action: () => adminService.resetPurchases(),
    },
    {
        key: 'stock',
        label: 'Stock & Stock History',
        description: 'Delete all stock levels and stock history records',
        icon: <FiPackage />,
        color: '#2196f3',
        action: () => adminService.resetStock(),
    },
    {
        key: 'feedbacks',
        label: 'Feedbacks',
        description: 'Delete all customer feedbacks',
        icon: <FiMessageSquare />,
        color: '#4caf50',
        action: () => adminService.resetFeedbacks(),
    },
    {
        key: 'franchise-enquiries',
        label: 'Franchise Enquiries',
        description: 'Delete all franchise enquiry records',
        icon: <FiBriefcase />,
        color: '#9c27b0',
        action: () => adminService.resetFranchiseEnquiries(),
    },
    {
        key: 'employees',
        label: 'Employees',
        description: 'Delete all employee records',
        icon: <FiUserCheck />,
        color: '#607d8b',
        action: () => adminService.resetEmployees(),
    },
];

const DataResetPage = () => {
    const [resetting, setResetting] = useState(null);
    const [confirm, setConfirm] = useState(null);

    const handleReset = async (category) => {
        setResetting(category.key);
        try {
            await category.action();
            toast.success(`${category.label} cleared successfully`);
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to reset ${category.label}`);
        } finally {
            setResetting(null);
            setConfirm(null);
        }
    };

    const handleResetAll = async () => {
        setResetting('all');
        try {
            await adminService.resetAll();
            toast.success('All data has been reset successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reset all data');
        } finally {
            setResetting(null);
            setConfirm(null);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>🔄 Data Reset</h1>
            </div>

            <div className="card" style={{ background: 'rgba(244,67,54,0.06)', border: '1px solid rgba(244,67,54,0.2)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px' }}>
                    <FiAlertTriangle style={{ color: '#f44336', fontSize: '24px', flexShrink: 0 }} />
                    <div>
                        <div style={{ fontWeight: 700, color: '#c62828', marginBottom: '4px' }}>Warning: Irreversible Operations</div>
                        <div style={{ fontSize: '13px', color: '#d32f2f' }}>
                            Data deleted from here cannot be recovered. Use these options carefully. This page is only accessible to Super Admin.
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {resetCategories.map(cat => (
                    <div key={cat.key} className="card" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: `${cat.color}15`, color: cat.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '20px', flexShrink: 0,
                            }}>
                                {cat.icon}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '15px' }}>{cat.label}</div>
                                <div style={{ fontSize: '12px', color: '#888' }}>{cat.description}</div>
                            </div>
                        </div>
                        <button
                            className="btn btn-outline"
                            style={{ width: '100%', color: cat.color, borderColor: `${cat.color}40` }}
                            onClick={() => setConfirm({ type: 'single', category: cat })}
                            disabled={resetting !== null}
                        >
                            {resetting === cat.key ? 'Clearing...' : `Clear ${cat.label}`}
                        </button>
                    </div>
                ))}
            </div>

            <div className="card" style={{ border: '2px solid rgba(244,67,54,0.3)', background: 'rgba(244,67,54,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '16px', color: '#c62828', marginBottom: '4px' }}>
                            ⚠️ Reset All Data
                        </div>
                        <div style={{ fontSize: '13px', color: '#888' }}>
                            Clears orders, purchases, stock, feedbacks, franchise enquiries, and employees at once.
                            Master data (shops, products, fruits, raw materials, users, recipes) will NOT be affected.
                        </div>
                    </div>
                    <button
                        className="btn"
                        style={{
                            background: '#f44336', color: '#fff', minWidth: '160px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}
                        onClick={() => setConfirm({ type: 'all' })}
                        disabled={resetting !== null}
                    >
                        <FiTrash2 /> {resetting === 'all' ? 'Resetting...' : 'Reset All Data'}
                    </button>
                </div>
            </div>

            {confirm && (
                <ConfirmDialog
                    isOpen={true}
                    title={confirm.type === 'all' ? 'Reset All Data?' : `Clear ${confirm.category.label}?`}
                    message={
                        confirm.type === 'all'
                            ? 'This will permanently delete ALL orders, purchases, stock, feedbacks, franchise enquiries, and employees. This cannot be undone.'
                            : `This will permanently delete all ${confirm.category.label.toLowerCase()}. This cannot be undone.`
                    }
                    confirmText={confirm.type === 'all' ? 'Reset Everything' : 'Yes, Clear'}
                    onConfirm={() => confirm.type === 'all' ? handleResetAll() : handleReset(confirm.category)}
                    onClose={() => setConfirm(null)}
                    loading={resetting !== null}
                />
            )}
        </div>
    );
};

export default DataResetPage;
