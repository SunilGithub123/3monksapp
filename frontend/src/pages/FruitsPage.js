import React, { useState, useEffect } from 'react';
import { adminService } from '../services/dataService';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const FruitsPage = () => {
    const [fruits, setFruits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', eligibleForShot: true, eligibleForBlend: true });

    useEffect(() => { fetchFruits(); }, []);

    const fetchFruits = async () => {
        try { const res = await adminService.getFruits(); setFruits(res.data.data || []); }
        catch { toast.error('Failed to load fruits'); }
        finally { setLoading(false); }
    };

    const openAdd = () => { setEditing(null); setForm({ name: '', description: '', eligibleForShot: true, eligibleForBlend: true }); setShowModal(true); };
    const openEdit = (f) => { setEditing(f); setForm({ name: f.name, description: f.description || '', eligibleForShot: f.eligibleForShot ?? true, eligibleForBlend: f.eligibleForBlend ?? true }); setShowModal(true); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) { await adminService.updateFruit(editing.id, form); toast.success('Fruit updated'); }
            else { await adminService.createFruit(form); toast.success('Fruit created'); }
            setShowModal(false); fetchFruits();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    };

    const handleToggle = async (id) => {
        try { await adminService.toggleFruit(id); toast.success('Toggled'); fetchFruits(); }
        catch { toast.error('Failed'); }
    };

    return (
        <div>
            <div className="page-header"><h1>Fruits Master</h1><button className="btn btn-primary" onClick={openAdd}>+ Add Fruit</button></div>
            {loading ? <div className="loading"><div className="spinner"></div></div> : (
                <div className="card"><div className="table-wrapper">
                    <table>
                        <thead><tr><th>Name</th><th>Description</th><th>Shot</th><th>Blend</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>{fruits.map(f => (
                            <tr key={f.id}>
                                <td style={{ fontWeight: 500 }}>{f.name}</td>
                                <td>{f.description || '-'}</td>
                                <td>{f.eligibleForShot ? '✅' : '❌'}</td>
                                <td>{f.eligibleForBlend ? '✅' : '❌'}</td>
                                <td><span className={`badge ${f.active ? 'badge-success' : 'badge-danger'}`}>{f.active ? 'Active' : 'Inactive'}</span></td>
                                <td style={{ display: 'flex', gap: '6px' }}>
                                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(f)}>Edit</button>
                                    <button className={`btn btn-sm ${f.active ? 'btn-danger' : 'btn-primary'}`} onClick={() => handleToggle(f.id)}>{f.active ? 'Disable' : 'Enable'}</button>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div></div>
            )}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Fruit' : 'Add Fruit'}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label>Name *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="form-group"><label>Description</label><input className="form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                    <div className="form-group" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                        <label><input type="checkbox" checked={form.eligibleForShot} onChange={e => setForm({ ...form, eligibleForShot: e.target.checked })} /> Eligible for Shot</label>
                        <label><input type="checkbox" checked={form.eligibleForBlend} onChange={e => setForm({ ...form, eligibleForBlend: e.target.checked })} /> Eligible for Blend</label>
                    </div>
                    <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
                </form>
            </Modal>
        </div>
    );
};

export default FruitsPage;
