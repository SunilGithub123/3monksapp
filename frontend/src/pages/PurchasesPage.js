import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { managerService, adminService, exportService } from '../services/dataService';
import { formatCurrency, formatDate, getISTDateString, getISTMonthString } from '../utils/helpers';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';

const PurchasesPage = () => {
    const { user, isAdmin } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ rawMaterialId: '', quantity: '', totalCost: '', vendorName: '', invoiceNumber: '', gstPercentage: '', gstAmount: '' });
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => { fetchPurchases(); fetchMaterials(); }, []); // eslint-disable-line

    const fetchPurchases = async () => {
        try {
            const shopId = user.shopId || 1;
            const res = await managerService.getShopPurchases(shopId);
            setPurchases(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load purchases');
        } finally {
            setLoading(false);
        }
    };

    const fetchMaterials = async () => {
        try { const res = await adminService.getRawMaterials(); setMaterials(res.data.data || []); } catch { }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await managerService.createPurchase({
                shopId: user.shopId || 1,
                rawMaterialId: parseInt(form.rawMaterialId),
                quantity: parseFloat(form.quantity),
                totalCost: parseFloat(form.totalCost),
                vendorName: form.vendorName,
                invoiceNumber: form.invoiceNumber,
                gstPercentage: form.gstPercentage ? parseFloat(form.gstPercentage) : null,
                gstAmount: form.gstAmount ? parseFloat(form.gstAmount) : null,
            });
            toast.success('Purchase recorded');
            setShowAdd(false);
            setForm({ rawMaterialId: '', quantity: '', totalCost: '', vendorName: '', invoiceNumber: '', gstPercentage: '', gstAmount: '' });
            fetchPurchases();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record purchase');
        }
    };

    const handleDeleteClick = (purchase) => {
        setConfirmDelete(purchase);
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            await adminService.deletePurchase(confirmDelete.id);
            toast.success('Purchase deleted — stock adjusted');
            setConfirmDelete(null);
            fetchPurchases();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete purchase');
        } finally {
            setDeleting(false);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const today = getISTDateString();
            const monthStart = getISTMonthString() + '-01';
            const res = await exportService.downloadPurchases(monthStart, today);
            const blob = new Blob([res.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `purchases_${monthStart}_to_${today}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success('Excel downloaded');
        } catch {
            toast.error('Failed to download');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Purchases</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {isAdmin() && (
                        <button className="btn btn-outline" onClick={handleDownload} disabled={downloading}>
                            {downloading ? '⏳' : '📥'} Excel
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ New Purchase</button>
                </div>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : purchases.length === 0 ? (
                <div className="empty-state"><div className="icon">🧾</div><p>No purchases recorded</p></div>
            ) : (
                <div className="card">
                    <div className="table-wrapper">
                        <table>
                            <thead><tr><th>Material</th><th>Qty</th><th>Cost</th><th>GST %</th><th>GST Amt</th><th>Vendor</th><th>Invoice</th><th>Date</th>{isAdmin() && <th>Actions</th>}</tr></thead>
                            <tbody>
                                {purchases.map(p => (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: 500 }}>{p.rawMaterialName}</td>
                                        <td>{p.quantity}</td>
                                        <td>{formatCurrency(p.totalCost)}</td>
                                        <td>{p.gstPercentage != null ? `${p.gstPercentage}%` : '-'}</td>
                                        <td>{p.gstAmount != null ? formatCurrency(p.gstAmount) : '-'}</td>
                                        <td>{p.vendorName || '-'}</td>
                                        <td>{p.invoiceNumber || '-'}</td>
                                        <td>{formatDate(p.purchaseDate)}</td>
                                        {isAdmin() && (
                                            <td>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteClick(p)}>Delete</button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Record Purchase">
                <form onSubmit={handleCreate}>
                    <div className="form-group">
                        <label>Raw Material *</label>
                        <select className="form-control" value={form.rawMaterialId} onChange={e => setForm({ ...form, rawMaterialId: e.target.value })} required>
                            <option value="">Select material...</option>
                            {materials.filter(m => m.active).map(m => <option key={m.id} value={m.id}>{m.name} ({m.unitType})</option>)}
                        </select>
                    </div>
                    <div className="grid-2">
                        <div className="form-group">
                            <label>Quantity *</label>
                            <input className="form-control" type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Total Cost (₹) *</label>
                            <input className="form-control" type="number" step="0.01" value={form.totalCost} onChange={e => setForm({ ...form, totalCost: e.target.value })} required />
                        </div>
                    </div>
                    <div className="grid-2">
                        <div className="form-group">
                            <label>GST %</label>
                            <input className="form-control" type="number" step="0.01" value={form.gstPercentage} onChange={e => setForm({ ...form, gstPercentage: e.target.value })} placeholder="e.g. 18" />
                        </div>
                        <div className="form-group">
                            <label>GST Amount (₹)</label>
                            <input className="form-control" type="number" step="0.01" value={form.gstAmount} onChange={e => setForm({ ...form, gstAmount: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Vendor Name</label>
                        <input className="form-control" value={form.vendorName} onChange={e => setForm({ ...form, vendorName: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Invoice Number</label>
                        <input className="form-control" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Purchase</button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDeleteConfirm}
                loading={deleting}
                title="Delete Purchase"
                message={`Delete purchase for ${confirmDelete?.rawMaterialName}?`}
                details={[
                    `${confirmDelete?.quantity} units of ${confirmDelete?.rawMaterialName} will be deducted from stock`,
                    `Invoice: ${confirmDelete?.invoiceNumber || 'N/A'}`,
                    `Amount: ${formatCurrency(confirmDelete?.totalCost)}`,
                    `Vendor: ${confirmDelete?.vendorName || 'N/A'}`,
                    `This purchase record will be permanently removed`
                ]}
                confirmText="Delete Purchase"
            />
        </div>
    );
};

export default PurchasesPage;
