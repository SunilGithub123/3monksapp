import React, { useState, useEffect } from 'react';
import { adminService } from '../services/dataService';
import { formatCurrency } from '../utils/helpers';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || '';

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [fruits, setFruits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', category: 'SHOT', price: '', description: '', fruitIds: [] });
    const [errors, setErrors] = useState({});
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        Promise.all([adminService.getProducts(), adminService.getFruits()])
            .then(([pRes, fRes]) => { setProducts(pRes.data.data || []); setFruits(fRes.data.data || []); })
            .catch(() => toast.error('Failed to load data'))
            .finally(() => setLoading(false));
    }, []);

    const fetchProducts = async () => {
        const res = await adminService.getProducts();
        setProducts(res.data.data || []);
    };

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', category: 'SHOT', price: '', description: '', fruitIds: [] });
        setErrors({});
        setImageFile(null);
        setImagePreview(null);
        setShowModal(true);
    };

    const openEdit = (p) => {
        setEditing(p);
        setForm({ name: p.name, category: p.category, price: p.price, description: p.description || '', fruitIds: p.fruits?.map(f => f.id) || [] });
        setErrors({});
        setImageFile(null);
        setImagePreview(p.hasImage ? `${API_BASE}/api/public/products/${p.id}/image` : null);
        setShowModal(true);
    };

    const validateForm = () => {
        const errs = {};
        if (!form.name || form.name.trim().length < 2) errs.name = 'Product name must be at least 2 characters';
        if (form.name && form.name.length > 100) errs.name = 'Product name cannot exceed 100 characters';
        if (!form.category) errs.category = 'Category is required';
        if (!form.price) errs.price = 'Price is required';
        else if (isNaN(form.price) || parseFloat(form.price) < 1) errs.price = 'Price must be at least ₹1';
        else if (parseFloat(form.price) > 99999.99) errs.price = 'Price cannot exceed ₹99,999.99';
        if (form.description && form.description.length > 500) errs.description = 'Description cannot exceed 500 characters';
        if (form.category === 'CREAMY_BLEND' && form.fruitIds.length > 1) errs.fruitIds = 'Creamy Blend can have maximum 1 fruit';
        if (form.category === 'CURATED_BLEND' && form.fruitIds.length > 2) errs.fruitIds = 'Curated Blend can have maximum 2 fruits';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('Image size must not exceed 5MB'); return; }
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) { toast.error('Only JPEG, PNG, GIF, and WebP images are allowed'); return; }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            const data = { ...form, price: parseFloat(form.price) };
            let productId;
            if (editing) {
                await adminService.updateProduct(editing.id, data);
                productId = editing.id;
                toast.success('Product updated');
            } else {
                const res = await adminService.createProduct(data);
                productId = res.data.data.id;
                toast.success('Product created');
            }
            if (imageFile && productId) {
                await adminService.uploadProductImage(productId, imageFile);
            }
            setShowModal(false); fetchProducts();
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
        try { await adminService.toggleProduct(id); toast.success('Toggled'); fetchProducts(); }
        catch { toast.error('Failed'); }
    };

    const toggleFruit = (fruitId) => {
        if (form.fruitIds.includes(fruitId)) {
            setForm({ ...form, fruitIds: form.fruitIds.filter(id => id !== fruitId) });
        } else {
            if (form.category === 'CREAMY_BLEND' && form.fruitIds.length >= 1) { toast.error('Max 1 fruit for creamy blends'); return; }
            if (form.category === 'CURATED_BLEND' && form.fruitIds.length >= 2) { toast.error('Max 2 fruits for curated blends'); return; }
            setForm({ ...form, fruitIds: [...form.fruitIds, fruitId] });
        }
        setErrors(prev => ({ ...prev, fruitIds: '' }));
    };

    return (
        <div>
            <div className="page-header"><h1>Products (Menu)</h1><button className="btn btn-primary" onClick={openAdd}>+ Add Product</button></div>
            {loading ? <div className="loading"><div className="spinner"></div></div> : (
                <div className="card"><div className="table-wrapper">
                    <table>
                        <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Fruits</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>{products.map(p => (
                            <tr key={p.id}>
                                <td>
                                    {p.hasImage ? (
                                        <img src={`${API_BASE}/api/public/products/${p.id}/image`} alt={p.name}
                                            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                            {p.category === 'SHOT' ? '🍊' : p.category === 'CREAMY_BLEND' ? '🥤' : '🍸'}
                                        </div>
                                    )}
                                </td>
                                <td style={{ fontWeight: 500 }}>{p.name}</td>
                                <td><span className={`badge ${p.category === 'SHOT' ? 'badge-info' : p.category === 'CREAMY_BLEND' ? 'badge-warning' : 'badge-success'}`}>{p.category.replace('_', ' ')}</span></td>
                                <td>{formatCurrency(p.price)}</td>
                                <td>{p.fruits?.map(f => f.name).join(', ') || '-'}</td>
                                <td><span className={`badge ${p.active ? 'badge-success' : 'badge-danger'}`}>{p.active ? 'Active' : 'Inactive'}</span></td>
                                <td style={{ display: 'flex', gap: '6px' }}>
                                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(p)}>Edit</button>
                                    <button className={`btn btn-sm ${p.active ? 'btn-danger' : 'btn-primary'}`} onClick={() => handleToggle(p.id)}>{p.active ? 'Disable' : 'Enable'}</button>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div></div>
            )}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : 'Add Product'}>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label>Product Image</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '2px solid var(--border)' }} />
                            ) : (
                                <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', border: '2px dashed var(--border)' }}>📷</div>
                            )}
                            <div>
                                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageChange} style={{ fontSize: '13px' }} />
                                <span className="field-hint">Max 5MB. JPEG, PNG, GIF, or WebP.</span>
                            </div>
                        </div>
                    </div>
                    <div className="form-group"><label>Name *</label>
                        <input className={`form-control${errors.name ? ' input-error' : ''}`} value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setErrors(prev => ({ ...prev, name: '' })); }} />
                        {errors.name && <span className="field-error">{errors.name}</span>}
                    </div>
                    <div className="grid-2">
                        <div className="form-group"><label>Category *</label>
                            <select className={`form-control${errors.category ? ' input-error' : ''}`} value={form.category} onChange={e => { setForm({ ...form, category: e.target.value, fruitIds: [] }); setErrors(prev => ({ ...prev, category: '' })); }}>
                                <option value="SHOT">Shot</option><option value="CREAMY_BLEND">Creamy Blend</option><option value="CURATED_BLEND">Curated Blend</option>
                            </select>
                            {errors.category && <span className="field-error">{errors.category}</span>}
                        </div>
                        <div className="form-group"><label>Price (₹) *</label>
                            <input className={`form-control${errors.price ? ' input-error' : ''}`} type="number" step="0.01" value={form.price} onChange={e => { setForm({ ...form, price: e.target.value }); setErrors(prev => ({ ...prev, price: '' })); }} />
                            {errors.price && <span className="field-error">{errors.price}</span>}
                        </div>
                    </div>
                    <div className="form-group"><label>Description</label>
                        <input className={`form-control${errors.description ? ' input-error' : ''}`} value={form.description} onChange={e => { setForm({ ...form, description: e.target.value }); setErrors(prev => ({ ...prev, description: '' })); }} />
                        {errors.description && <span className="field-error">{errors.description}</span>}
                    </div>
                    <div className="form-group">
                        <label>Fruits {form.category === 'CURATED_BLEND' ? '(max 2)' : form.category === 'CREAMY_BLEND' ? '(max 1)' : '(1 for shots)'}</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                            {fruits.map(f => (
                                <button key={f.id} type="button" onClick={() => toggleFruit(f.id)}
                                    className={`btn btn-sm ${form.fruitIds.includes(f.id) ? 'btn-primary' : 'btn-outline'}`}>
                                    {f.name}
                                </button>
                            ))}
                        </div>
                        {errors.fruitIds && <span className="field-error">{errors.fruitIds}</span>}
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

export default ProductsPage;
