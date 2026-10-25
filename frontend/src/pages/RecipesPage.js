import React, { useState, useEffect } from 'react';
import { adminService } from '../services/dataService';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const RecipesPage = () => {
    const [recipes, setRecipes] = useState([]);
    const [products, setProducts] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ productId: '', rawMaterialId: '', quantityRequired: '' });
    const [errors, setErrors] = useState({});

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            const [recipeRes, prodRes, matRes] = await Promise.all([
                adminService.getRecipes(),
                adminService.getProducts(),
                adminService.getRawMaterials()
            ]);
            setRecipes(recipeRes.data.data || []);
            setProducts(prodRes.data.data || []);
            setMaterials(matRes.data.data || []);
        } catch { toast.error('Failed to load data'); }
        finally { setLoading(false); }
    };

    const validateForm = () => {
        const errs = {};
        if (!form.productId) errs.productId = 'Please select a product';
        if (!form.rawMaterialId) errs.rawMaterialId = 'Please select a raw material';
        if (!form.quantityRequired) errs.quantityRequired = 'Quantity is required';
        else if (isNaN(form.quantityRequired) || parseFloat(form.quantityRequired) < 0.01) errs.quantityRequired = 'Quantity must be at least 0.01';
        else if (parseFloat(form.quantityRequired) > 99999.99) errs.quantityRequired = 'Quantity cannot exceed 99,999.99';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            await adminService.createRecipe({
                productId: parseInt(form.productId),
                rawMaterialId: parseInt(form.rawMaterialId),
                quantityRequired: parseFloat(form.quantityRequired),
            });
            toast.success('Recipe added');
            setShowModal(false);
            setForm({ productId: '', rawMaterialId: '', quantityRequired: '' });
            fetchAll();
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

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this recipe entry?')) return;
        try { await adminService.deleteRecipe(id); toast.success('Deleted'); fetchAll(); }
        catch { toast.error('Failed'); }
    };

    // Group recipes by product
    const grouped = {};
    recipes.forEach(r => {
        if (!grouped[r.productName]) grouped[r.productName] = [];
        grouped[r.productName].push(r);
    });

    return (
        <div>
            <div className="page-header"><h1>Recipes</h1><button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Recipe</button></div>

            {loading ? <div className="loading"><div className="spinner"></div></div> : recipes.length === 0 ? (
                <div className="empty-state"><div className="icon">📋</div><p>No recipes defined</p></div>
            ) : (
                Object.entries(grouped).map(([productName, items]) => (
                    <div className="card" key={productName} style={{ marginBottom: '16px' }}>
                        <h3 style={{ margin: '0 0 12px 0', color: 'var(--primary)' }}>{productName}</h3>
                        <div className="table-wrapper">
                            <table>
                                <thead><tr><th>Raw Material</th><th>Unit</th><th>Qty Required</th><th>Actions</th></tr></thead>
                                <tbody>{items.map(r => (
                                    <tr key={r.id}>
                                        <td style={{ fontWeight: 500 }}>{r.rawMaterialName}</td>
                                        <td>{r.unitType}</td>
                                        <td>{r.quantityRequired}</td>
                                        <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id)}>Delete</button></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setErrors({}); }} title="Add Recipe Entry">
                <form onSubmit={handleCreate} noValidate>
                    <div className="form-group"><label>Product *</label>
                        <select className={`form-control${errors.productId ? ' input-error' : ''}`} value={form.productId} onChange={e => { setForm({ ...form, productId: e.target.value }); setErrors(prev => ({ ...prev, productId: '' })); }}>
                            <option value="">Select product...</option>
                            {products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.category})</option>)}
                        </select>
                        {errors.productId && <span className="field-error">{errors.productId}</span>}
                    </div>
                    <div className="form-group"><label>Raw Material *</label>
                        <select className={`form-control${errors.rawMaterialId ? ' input-error' : ''}`} value={form.rawMaterialId} onChange={e => { setForm({ ...form, rawMaterialId: e.target.value }); setErrors(prev => ({ ...prev, rawMaterialId: '' })); }}>
                            <option value="">Select material...</option>
                            {materials.filter(m => m.active).map(m => <option key={m.id} value={m.id}>{m.name} ({m.unitType})</option>)}
                        </select>
                        {errors.rawMaterialId && <span className="field-error">{errors.rawMaterialId}</span>}
                    </div>
                    <div className="form-group"><label>Quantity Required *</label>
                        <input className={`form-control${errors.quantityRequired ? ' input-error' : ''}`} type="number" step="0.01" value={form.quantityRequired} onChange={e => { setForm({ ...form, quantityRequired: e.target.value }); setErrors(prev => ({ ...prev, quantityRequired: '' })); }} placeholder="e.g. 150 (in material's unit)" />
                        {errors.quantityRequired && <span className="field-error">{errors.quantityRequired}</span>}
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

export default RecipesPage;
