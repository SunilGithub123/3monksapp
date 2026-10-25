import React, { useState, useEffect } from 'react';
import { adminService } from '../services/dataService';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const ShopsPage = () => {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', gstNumber: '' });
    const [errors, setErrors] = useState({});

    useEffect(() => { fetchShops(); }, []);

    const fetchShops = async () => {
        try {
            const res = await adminService.getShops();
            setShops(res.data.data || []);
        } catch { toast.error('Failed to load shops'); }
        finally { setLoading(false); }
    };

    const openAdd = () => { setEditing(null); setForm({ name: '', address: '', phone: '', email: '', gstNumber: '' }); setErrors({}); setShowModal(true); };
    const openEdit = (shop) => { setEditing(shop); setForm({ name: shop.name, address: shop.address || '', phone: shop.phone || '', email: shop.email || '', gstNumber: shop.gstNumber || '' }); setErrors({}); setShowModal(true); };

    const validateForm = () => {
        const errs = {};
        if (!form.name || form.name.trim().length < 2) errs.name = 'Shop name must be at least 2 characters';
        if (form.name && form.name.length > 100) errs.name = 'Shop name cannot exceed 100 characters';
        if (!form.address || form.address.trim().length < 5) errs.address = 'Address must be at least 5 characters';
        if (form.address && form.address.length > 500) errs.address = 'Address cannot exceed 500 characters';
        if (form.phone && !/^[0-9]{10}$/.test(form.phone)) errs.phone = 'Phone number must be exactly 10 digits';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email address';
        if (form.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstNumber)) errs.gstNumber = 'Please enter a valid 15-character GST number';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            if (editing) { await adminService.updateShop(editing.id, form); toast.success('Shop updated'); }
            else { await adminService.createShop(form); toast.success('Shop created'); }
            setShowModal(false); fetchShops();
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
        try { await adminService.toggleShop(id); toast.success('Shop toggled'); fetchShops(); }
        catch { toast.error('Failed'); }
    };

    return (
        <div>
            <div className="page-header"><h1>Shops</h1><button className="btn btn-primary" onClick={openAdd}>+ Add Shop</button></div>
            {loading ? <div className="loading"><div className="spinner"></div></div> : (
                <div className="card"><div className="table-wrapper">
                    <table>
                        <thead><tr><th>Name</th><th>Address</th><th>Phone</th><th>GST</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>{shops.map(s => (
                            <tr key={s.id}>
                                <td style={{ fontWeight: 500 }}>{s.name}</td>
                                <td>{s.address || '-'}</td>
                                <td>{s.phone || '-'}</td>
                                <td>{s.gstNumber || '-'}</td>
                                <td><span className={`badge ${s.active ? 'badge-success' : 'badge-danger'}`}>{s.active ? 'Active' : 'Inactive'}</span></td>
                                <td style={{ display: 'flex', gap: '6px' }}>
                                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(s)}>Edit</button>
                                    <button className={`btn btn-sm ${s.active ? 'btn-danger' : 'btn-primary'}`} onClick={() => handleToggle(s.id)}>{s.active ? 'Disable' : 'Enable'}</button>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div></div>
            )}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Shop' : 'Add Shop'}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group"><label>Name *</label>
                        <input className={`form-control${errors.name ? ' input-error' : ''}`} value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setErrors(prev => ({ ...prev, name: '' })); }} />
                        {errors.name && <span className="field-error">{errors.name}</span>}
                    </div>
                    <div className="form-group"><label>Address *</label>
                        <input className={`form-control${errors.address ? ' input-error' : ''}`} value={form.address} onChange={e => { setForm({ ...form, address: e.target.value }); setErrors(prev => ({ ...prev, address: '' })); }} />
                        {errors.address && <span className="field-error">{errors.address}</span>}
                    </div>
                    <div className="grid-2">
                        <div className="form-group"><label>Phone</label>
                            <input className={`form-control${errors.phone ? ' input-error' : ''}`} value={form.phone} onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors(prev => ({ ...prev, phone: '' })); }} placeholder="10 digits" />
                            {errors.phone && <span className="field-error">{errors.phone}</span>}
                        </div>
                        <div className="form-group"><label>Email</label>
                            <input className={`form-control${errors.email ? ' input-error' : ''}`} type="email" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setErrors(prev => ({ ...prev, email: '' })); }} />
                            {errors.email && <span className="field-error">{errors.email}</span>}
                        </div>
                    </div>
                    <div className="form-group"><label>GST Number</label>
                        <input className={`form-control${errors.gstNumber ? ' input-error' : ''}`} value={form.gstNumber} onChange={e => { setForm({ ...form, gstNumber: e.target.value.toUpperCase() }); setErrors(prev => ({ ...prev, gstNumber: '' })); }} placeholder="e.g. 22AAAAA0000A1Z5" />
                        {errors.gstNumber && <span className="field-error">{errors.gstNumber}</span>}
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

export default ShopsPage;
