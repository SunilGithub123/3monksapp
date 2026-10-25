import React, { useState, useEffect } from 'react';
import { adminService } from '../services/dataService';
import { formatDate } from '../utils/helpers';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const RawMaterialsPage = () => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', unitType: 'KG', costPerUnit: '', vendorName: '', vendorContact: '', reorderLevel: '' });
    const [errors, setErrors] = useState({});

    useEffect(() => { fetchMaterials(); }, []);

    const fetchMaterials = async () => {
        try { const res = await adminService.getRawMaterials(); setMaterials(res.data.data || []); }
        catch { toast.error('Failed to load materials'); }
        finally { setLoading(false); }
    };

    const openAdd = () => { setEditing(null); setForm({ name: '', unitType: 'KG', costPerUnit: '', vendorName: '', vendorContact: '', reorderLevel: '' }); setErrors({}); setShowModal(true); };
    const openEdit = (m) => { setEditing(m); setForm({ name: m.name, unitType: m.unitType, costPerUnit: m.costPerUnit || '', vendorName: m.vendorName || '', vendorContact: m.vendorContact || '', reorderLevel: m.reorderLevel || '' }); setErrors({}); setShowModal(true); };

    const validateForm = () => {
        const errs = {};
        if (!form.name || form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
        if (form.name && form.name.length > 100) errs.name = 'Name cannot exceed 100 characters';
        if (!form.costPerUnit) errs.costPerUnit = 'Cost per unit is required';
        else if (isNaN(form.costPerUnit) || parseFloat(form.costPerUnit) < 0.01) errs.costPerUnit = 'Cost must be at least ₹0.01';
        else if (parseFloat(form.costPerUnit) > 999999.99) errs.costPerUnit = 'Cost cannot exceed ₹9,99,999.99';
        if (form.vendorContact && !/^[0-9]{10}$/.test(form.vendorContact)) errs.vendorContact = 'Contact must be exactly 10 digits';
        if (form.reorderLevel && (isNaN(form.reorderLevel) || parseFloat(form.reorderLevel) < 0.01)) errs.reorderLevel = 'Reorder level must be at least 0.01';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            const data = { ...form, costPerUnit: parseFloat(form.costPerUnit), reorderLevel: form.reorderLevel ? parseFloat(form.reorderLevel) : null };
            if (editing) { await adminService.updateRawMaterial(editing.id, data); toast.success('Updated'); }
            else { await adminService.createRawMaterial(data); toast.success('Created'); }
            setShowModal(false); fetchMaterials();
        } catch (err) {
            const resp = err.response?.data;
            if (resp?.data && typeof resp.data === 'object' && resp.message === 'Validation failed') {
                setErrors(resp.data);
                toast.error(Object.values(resp.data)[0] || 'Please fix the errors below');
            } else {
                toast.error(resp?.message || 'Failed');
            }
        } finally { setSubmitting(false); }
    };

    const handleToggle = async (id) => {
        try { await adminService.toggleRawMaterial(id); toast.success('Toggled'); fetchMaterials(); }
        catch { toast.error('Failed'); }
    };

    return (
        <div>
            <div className="page-header"><h1>Raw Materials</h1><button className="btn btn-primary" onClick={openAdd}>+ Add Material</button></div>
            {loading ? <div className="loading"><div className="spinner"></div></div> : (
                <div className="card"><div className="table-wrapper">
                    <table>
                        <thead><tr><th>Name</th><th>Unit</th><th>Cost/Unit</th><th>Vendor</th><th>Reorder Level</th><th>Last Purchase</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>{materials.map(m => (
                            <tr key={m.id}>
                                <td style={{ fontWeight: 500 }}>{m.name}</td>
                                <td>{m.unitType}</td>
                                <td>₹{m.costPerUnit}</td>
                                <td>{m.vendorName || '-'}</td>
                                <td>{m.reorderLevel || '-'}</td>
                                <td>{m.lastPurchaseDate ? formatDate(m.lastPurchaseDate) : '-'}</td>
                                <td><span className={`badge ${m.active ? 'badge-success' : 'badge-danger'}`}>{m.active ? 'Active' : 'Inactive'}</span></td>
                                <td style={{ display: 'flex', gap: '6px' }}>
                                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(m)}>Edit</button>
                                    <button className={`btn btn-sm ${m.active ? 'btn-danger' : 'btn-primary'}`} onClick={() => handleToggle(m.id)}>{m.active ? 'Disable' : 'Enable'}</button>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div></div>
            )}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Material' : 'Add Material'}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group"><label>Name *</label>
                        <input className={`form-control${errors.name ? ' input-error' : ''}`} value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setErrors(prev => ({ ...prev, name: '' })); }} />
                        {errors.name && <span className="field-error">{errors.name}</span>}
                    </div>
                    <div className="grid-2">
                        <div className="form-group"><label>Unit Type *</label>
                            <select className="form-control" value={form.unitType} onChange={e => setForm({ ...form, unitType: e.target.value })}>
                                <option value="KG">KG</option><option value="GRAM">GRAM</option><option value="LITRE">LITRE</option>
                                <option value="ML">ML</option><option value="PIECE">PIECE</option><option value="DOZEN">DOZEN</option>
                            </select>
                        </div>
                        <div className="form-group"><label>Cost per Unit (₹) *</label>
                            <input className={`form-control${errors.costPerUnit ? ' input-error' : ''}`} type="number" step="0.01" value={form.costPerUnit} onChange={e => { setForm({ ...form, costPerUnit: e.target.value }); setErrors(prev => ({ ...prev, costPerUnit: '' })); }} />
                            {errors.costPerUnit && <span className="field-error">{errors.costPerUnit}</span>}
                        </div>
                    </div>
                    <div className="grid-2">
                        <div className="form-group"><label>Vendor Name</label>
                            <input className="form-control" value={form.vendorName} onChange={e => setForm({ ...form, vendorName: e.target.value })} />
                        </div>
                        <div className="form-group"><label>Vendor Contact</label>
                            <input className={`form-control${errors.vendorContact ? ' input-error' : ''}`} value={form.vendorContact} onChange={e => { setForm({ ...form, vendorContact: e.target.value }); setErrors(prev => ({ ...prev, vendorContact: '' })); }} placeholder="10 digits" />
                            {errors.vendorContact && <span className="field-error">{errors.vendorContact}</span>}
                        </div>
                    </div>
                    <div className="form-group"><label>Reorder Level</label>
                        <input className={`form-control${errors.reorderLevel ? ' input-error' : ''}`} type="number" step="0.01" value={form.reorderLevel} onChange={e => { setForm({ ...form, reorderLevel: e.target.value }); setErrors(prev => ({ ...prev, reorderLevel: '' })); }} placeholder="Alert when stock drops below this" />
                        {errors.reorderLevel && <span className="field-error">{errors.reorderLevel}</span>}
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? <><span className="btn-spinner"></span> Saving...</> : 'Save'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default RawMaterialsPage;
