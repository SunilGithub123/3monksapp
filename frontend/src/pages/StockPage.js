import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { managerService, adminService } from '../services/dataService';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const StockPage = () => {
    const { user } = useAuth();
    const [stock, setStock] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ shopId: '', rawMaterialId: '', quantity: '', minimumThreshold: '', notes: '' });

    useEffect(() => { fetchStock(); fetchMaterials(); }, []); // eslint-disable-line

    const fetchStock = async () => {
        try {
            const shopId = user.shopId || 1;
            const res = await managerService.getShopStock(shopId);
            setStock(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load stock');
        } finally {
            setLoading(false);
        }
    };

    const fetchMaterials = async () => {
        try { const res = await adminService.getRawMaterials(); setMaterials(res.data.data || []); } catch { }
    };

    const handleAddStock = async (e) => {
        e.preventDefault();
        try {
            await managerService.addStock({
                shopId: user.shopId || parseInt(form.shopId) || 1,
                rawMaterialId: parseInt(form.rawMaterialId),
                quantity: parseFloat(form.quantity),
                minimumThreshold: form.minimumThreshold ? parseFloat(form.minimumThreshold) : null,
                notes: form.notes,
            });
            toast.success('Stock added');
            setShowAdd(false);
            setForm({ shopId: '', rawMaterialId: '', quantity: '', minimumThreshold: '', notes: '' });
            fetchStock();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add stock');
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Stock Management</h1>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Stock</button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : stock.length === 0 ? (
                <div className="empty-state"><div className="icon">📦</div><p>No stock entries yet</p></div>
            ) : (
                <div className="card">
                    <div className="table-wrapper">
                        <table>
                            <thead><tr><th>Material</th><th>Opening Stock</th><th>Current Qty</th><th>Unit</th><th>Min Threshold</th><th>Status</th></tr></thead>
                            <tbody>
                                {stock.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 500 }}>{s.rawMaterialName}</td>
                                        <td>{s.openingStock || '-'}</td>
                                        <td>{s.quantity}</td>
                                        <td>{s.unitType}</td>
                                        <td>{s.minimumThreshold || '-'}</td>
                                        <td>
                                            <span className={`badge ${s.lowStock ? 'badge-danger' : 'badge-success'}`}>
                                                {s.lowStock ? 'LOW' : 'OK'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Stock">
                <form onSubmit={handleAddStock}>
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
                            <label>Min Threshold</label>
                            <input className="form-control" type="number" step="0.01" value={form.minimumThreshold} onChange={e => setForm({ ...form, minimumThreshold: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Notes</label>
                        <input className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Stock</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StockPage;
