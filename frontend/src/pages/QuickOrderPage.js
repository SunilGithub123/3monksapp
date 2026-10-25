import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { publicService, orderService } from '../services/dataService';
import { formatCurrency } from '../utils/helpers';
import Receipt from '../components/Receipt';
import toast from 'react-hot-toast';
import {
    isBluetoothAvailable,
    isPrinterConnected,
    getPrinterName,
    connectPrinter,
    printReceipt as btPrintReceipt,
    printToken as btPrintToken,
    disconnectPrinter,
} from '../services/bluetoothPrinter';

const QuickOrderPage = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [fruits, setFruits] = useState([]);
    const [mode, setMode] = useState('BLEND');
    const [selectedBlendFruits, setSelectedBlendFruits] = useState([]);
    const [cart, setCart] = useState([]);
    const [paymentMode, setPaymentMode] = useState('UPI');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState(null);
    const [btConnected, setBtConnected] = useState(false);
    const [btPrinting, setBtPrinting] = useState(false);
    const [tokenPrinting, setTokenPrinting] = useState(false);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [completing, setCompleting] = useState(null);
    const receiptRef = useRef();

    const fetchPendingOrders = useCallback(async () => {
        try {
            const res = await orderService.getPendingOrders(user?.shopId);
            setPendingOrders(res.data.data || []);
        } catch (_) { /* silent */ }
    }, [user?.shopId]);

    useEffect(() => {
        Promise.all([
            publicService.getMenu(),
            publicService.getFruits(),
        ]).then(([menuRes, fruitRes]) => {
            setProducts(menuRes.data.data || []);
            setFruits(fruitRes.data.data || []);
        }).catch(() => toast.error('Failed to load menu'));
        fetchPendingOrders();
        const interval = setInterval(fetchPendingOrders, 10000);
        return () => clearInterval(interval);
    }, [fetchPendingOrders]);

    const handleComplete = async (orderId) => {
        setCompleting(orderId);
        try {
            await orderService.completeOrder(orderId);
            toast.success('Order delivered!');
            fetchPendingOrders();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to mark as delivered');
        } finally {
            setCompleting(null);
        }
    };

    const addCartItem = (product, customName) => {
        if (!product) return;
        const cartKey = customName ? `${product.id}-${customName}` : `${product.id}`;
        const existing = cart.find(item => item.cartKey === cartKey);

        if (existing) {
            setCart(cart.map(item => item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, {
                cartKey,
                productId: product.id,
                productName: customName || product.name,
                category: product.category,
                unitPrice: product.price,
                quantity: 1,
                customization: customName || null,
            }]);
        }
    };

    const addShot = (fruit) => {
        if (!fruit || !fruit.eligibleForShot) {
            toast.error('Fruit is not eligible for shots.');
            return;
        }
        const shotProduct = products.find(p => p.category === 'SHOT' && p.fruits?.some(f => f.id === fruit.id));
        if (!shotProduct) {
            toast.error(`No shot product available for ${fruit.name}`);
            return;
        }
        addCartItem(shotProduct);
        toast.success(`Added shot: ${shotProduct.name}`);
    };

    const addSingleBlend = (fruit) => {
        if (!fruit || !fruit.eligibleForBlend) {
            toast.error('Fruit is not eligible for blends.');
            return;
        }
        const blendProduct = products.find(p =>
            p.category === 'CREAMY_BLEND' && p.fruits?.some(f => f.id === fruit.id)
        );
        if (!blendProduct) {
            const fallback = products.find(p => p.category === 'CURATED_BLEND');
            if (!fallback) {
                toast.error('No blend products configured.');
                return;
            }
            addCartItem(fallback, fruit.name);
            toast.success(`Added custom blend: ${fruit.name}`);
        } else {
            addCartItem(blendProduct);
            toast.success(`Added blend: ${blendProduct.name}`);
        }
    };

    const toggleBlendSelection = (fruit) => {
        if (!fruit || !fruit.eligibleForBlend) {
            toast.error('Fruit is not eligible for blends.');
            return;
        }
        setSelectedBlendFruits(prev => {
            let newSelection;
            if (prev.some(f => f.id === fruit.id)) {
                newSelection = prev.filter(f => f.id !== fruit.id);
            } else {
                if (prev.length >= 2) return prev;
                newSelection = [...prev, fruit];
            }

            // Auto-add when exactly 2 fruits selected for curated blend
            if (mode === 'CURATED_BLEND' && newSelection.length === 2) {
                addCuratedBlend(newSelection);
            }

            return newSelection;
        });
    };

    const addCuratedBlend = (selectedFruits = selectedBlendFruits) => {
        if (selectedFruits.length === 0) {
            toast.error('Select at least one fruit for blend.');
            return;
        }

        if (selectedFruits.length === 1) {
            const [fruit1] = selectedFruits;
            const creamyProduct = products.find(p =>
                p.category === 'CREAMY_BLEND' && p.fruits?.some(f => f.id === fruit1.id)
            );
            if (creamyProduct) {
                addCartItem(creamyProduct);
                toast.success(`Added blend: ${creamyProduct.name}`);
            } else {
                const fallback = products.find(p => p.category === 'CURATED_BLEND');
                if (!fallback) {
                    toast.error('No blend products configured.');
                    return;
                }
                addCartItem(fallback, fruit1.name);
                toast.success(`Added custom blend: ${fruit1.name}`);
            }
            setSelectedBlendFruits([]);
            return;
        }

        if (selectedFruits.length > 2) {
            toast.error('Select up to two fruits for blend.');
            return;
        }

        const [fruit1, fruit2] = selectedFruits;
        const curatedProduct = products.find(p =>
            p.category === 'CURATED_BLEND' &&
            p.fruits?.some(f => f.id === fruit1.id) &&
            p.fruits?.some(f => f.id === fruit2.id)
        );

        if (curatedProduct) {
            addCartItem(curatedProduct);
            toast.success(`Added blend: ${curatedProduct.name}`);
        } else {
            const fallback = products.find(p => p.category === 'CURATED_BLEND');
            if (!fallback) {
                toast.error('No curated blend products configured.');
                return;
            }
            const customName = `${fruit1.name} + ${fruit2.name}`;
            addCartItem(fallback, customName);
            toast.success(`Added custom blend: ${customName}`);
        }
        setSelectedBlendFruits([]);
    };

    const clearBlendSelection = () => setSelectedBlendFruits([]);

    const updateQuantity = (cartKey, qty) => {
        if (qty <= 0) {
            setCart(cart.filter(item => item.cartKey !== cartKey));
        } else {
            setCart(cart.map(item =>
                item.cartKey === cartKey ? { ...item, quantity: qty } : item
            ));
        }
    };

    const getTotal = () => cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    const handleSubmit = async () => {
        if (cart.length === 0) { toast.error('Add items first'); return; }
        setLoading(true);
        try {
            const res = await orderService.createOrder({
                shopId: user.shopId,
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    customization: item.customization,
                })),
                paymentMode,
                customerName: customerName || undefined,
                customerPhone: customerPhone || undefined,
            });
            setOrder(res.data.data);
            toast.success('Order created!');
            setCart([]);
            fetchPendingOrders();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => { window.print(); };

    const handleConnectPrinter = async () => {
        try {
            const result = await connectPrinter();
            setBtConnected(true);
            toast.success(result.reconnected
                ? `Reconnected to ${result.name}`
                : `Connected to ${result.name}!`
            );
        } catch (e) {
            if (e.name === 'NotFoundError') return;
            toast.error(e.message || 'Failed to connect printer');
        }
    };

    const handleBluetoothPrint = async () => {
        if (!order) return;
        setBtPrinting(true);
        try {
            await btPrintReceipt(order);
            toast.success('Receipt printed!');
        } catch (e) {
            setBtConnected(false);
            toast.error(e.message || 'Print failed');
        } finally {
            setBtPrinting(false);
        }
    };

    const handleTokenPrint = async () => {
        if (!order) return;
        setTokenPrinting(true);
        try {
            await btPrintToken(order);
            toast.success('Token printed!');
        } catch (e) {
            setBtConnected(false);
            toast.error(e.message || 'Token print failed');
        } finally {
            setTokenPrinting(false);
        }
    };

    // === ORDER CONFIRMED VIEW ===
    if (order) {
        const btAvailable = isBluetoothAvailable();
        const printerReady = btConnected && isPrinterConnected();
        const printerName = getPrinterName();

        return (
            <div>
                <div className="page-header"><h1>Order Confirmed! ✅</h1></div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
                    <button className="btn btn-primary" onClick={() => { setOrder(null); setCustomerName(''); setCustomerPhone(''); }}>
                        ➕ New Order
                    </button>
                    {btAvailable && (
                        printerReady ? (
                            <>
                                <button className="btn btn-outline" onClick={handleTokenPrint} disabled={tokenPrinting}
                                    style={{ minWidth: '120px' }}>
                                    {tokenPrinting ? '⏳ Printing...' : '🎫 Print Token'}
                                </button>
                                <button className="btn btn-outline" onClick={handleBluetoothPrint} disabled={btPrinting}
                                    style={{ minWidth: '120px' }}>
                                    {btPrinting ? '⏳ Printing...' : '🖨️ Print Receipt'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="btn btn-outline" disabled style={{ minWidth: '120px', opacity: 0.5 }}>
                                    🎫 Print Token
                                </button>
                                <button className="btn btn-outline" disabled style={{ minWidth: '120px', opacity: 0.5 }}>
                                    🖨️ Print Receipt
                                </button>
                                <button className="btn btn-outline" onClick={handleConnectPrinter}>🔗 Connect Printer</button>
                            </>
                        )
                    )}
                </div>
                {printerReady && printerName && (
                    <div style={{
                        background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)',
                        borderRadius: '8px', padding: '8px 16px', marginBottom: '16px', fontSize: '13px',
                        color: '#4caf50', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span>✅ Connected: <strong>{printerName}</strong></span>
                        <button onClick={() => { disconnectPrinter(); setBtConnected(false); }}
                            style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontSize: '12px' }}>
                            Disconnect
                        </button>
                    </div>
                )}
                <div className="card"><Receipt ref={receiptRef} order={order} /></div>
            </div>
        );
    }

    const fruitCodesStrip = null;


    // === QUICK ORDER VIEW ===
    return (
        <div className="quick-order-page">
            {/* Fruit Codes Strip — portrait: above entire grid; hidden in landscape */}
            <div className="quick-order-grid">
                {/* Left: Fruit-based selector (no numpad) */}
                <div>
                    <div className="card quick-input-card">
                        <div className="quick-action-tabs" style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                            <button className={`btn ${mode === 'BLEND' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setMode('BLEND'); setSelectedBlendFruits([]); }}>Blends</button>
                            <button className={`btn ${mode === 'CURATED_BLEND' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setMode('CURATED_BLEND'); setSelectedBlendFruits([]); }}>Curated Blend</button>
                        </div>

                        {mode === 'BLEND' ? (
                            <div style={{ marginBottom: '16px' }}>
                                <h4 style={{ marginBottom: '8px' }}>Single Blends</h4>
                                <div className="quick-fruit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '8px' }}>
                                    {fruits.filter(f => f.active && f.eligibleForBlend).map(fruit => (
                                        <button
                                            key={fruit.id}
                                            className="btn btn-outline"
                                            onClick={() => addSingleBlend(fruit)}
                                            style={{ whiteSpace: 'normal', minHeight: '48px', textAlign: 'center' }}
                                        >
                                            {fruit.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '12px' }}>
                                    <strong>Selected:</strong> {selectedBlendFruits.map(f => f.name).join(' + ') || 'None'}
                                </div>
                                <div className="quick-fruit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '8px' }}>
                                    {fruits.filter(f => f.active).map(fruit => {
                                        const isSelected = selectedBlendFruits.some(f => f.id === fruit.id);
                                        const eligible = fruit.eligibleForBlend;
                                        return (
                                            <button
                                                key={fruit.id}
                                                className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                                                disabled={!eligible}
                                                onClick={() => toggleBlendSelection(fruit)}
                                                style={{ whiteSpace: 'normal', minHeight: '48px', textAlign: 'center' }}
                                            >
                                                {fruit.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        <div>
                            <h4 style={{ marginBottom: '8px' }}>Shots</h4>
                            <div className="quick-fruit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '8px' }}>
                                {fruits.filter(f => f.active && f.eligibleForShot).map(fruit => (
                                    <button
                                        key={fruit.id}
                                        className="btn btn-outline"
                                        onClick={() => addShot(fruit)}
                                        style={{ whiteSpace: 'normal', minHeight: '48px', textAlign: 'center' }}
                                    >
                                        {fruit.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>


                {/* Center: Cart + Place Order */}
                <div>
                    <div className="card">
                        <h3 style={{ marginBottom: '12px' }}>🛒 Cart ({cart.length})</h3>

                        {cart.length === 0 ? (
                            <p className="order-cart-empty">Use the panels above to add items</p>
                        ) : (
                            <>
                                {cart.map(item => (
                                    <div key={item.cartKey} className="order-cart-item">
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{item.productName}</div>
                                            <div className="order-cart-item-price">{formatCurrency(item.unitPrice)} each</div>
                                        </div>
                                        <div className="order-cart-item-controls">
                                            <button className="btn btn-sm btn-outline" onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}>-</button>
                                            <span className="order-cart-item-qty">{item.quantity}</span>
                                            <button className="btn btn-sm btn-outline" onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}>+</button>
                                            <span className="order-cart-item-total">{formatCurrency(item.unitPrice * item.quantity)}</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="order-cart-total">
                                    <span>Total</span>
                                    <span style={{ color: 'var(--primary)' }}>{formatCurrency(getTotal())}</span>
                                </div>
                            </>
                        )}

                        <div className="order-cart-form">
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div className="form-group" style={{ flex: 1, marginBottom: '8px' }}>
                                    <input className="form-control" placeholder="Name (optional)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ flex: 1, marginBottom: '8px' }}>
                                    <input className="form-control" placeholder="Phone (optional)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                <div className="order-payment-modes">
                                    {['CASH', 'UPI'].map(mode => (
                                        <button key={mode} className={`btn ${paymentMode === mode ? 'btn-primary' : 'btn-outline'} order-payment-btn`}
                                            onClick={() => setPaymentMode(mode)}>
                                            {mode === 'CASH' ? '💵' : '📱'} {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button className="btn btn-primary btn-lg order-submit-btn"
                                onClick={handleSubmit} disabled={cart.length === 0 || loading}>
                                {loading ? 'Processing...' : `Place Order • ${formatCurrency(getTotal())}`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Order Queue */}
                <div>
                    <div className="card quick-queue-panel">
                        <h3 style={{ marginBottom: '8px' }}>📋 Queue ({pendingOrders.length})</h3>
                        {pendingOrders.length === 0 ? (
                            <p style={{ color: '#888', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>✅ All delivered!</p>
                        ) : (
                            <div className="quick-queue-list">
                                {pendingOrders.map((o, idx) => (
                                    <div key={o.id} className={`quick-queue-item ${idx === 0 ? 'quick-queue-item-active' : ''}`}>
                                        <div className="quick-queue-item-header">
                                            <span className="quick-queue-item-token">#{o.tokenNumber}</span>
                                            <span className="quick-queue-item-time">
                                                {new Date(o.orderDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="quick-queue-item-detail">
                                            {o.items?.map(i => `${i.quantity}× ${i.productName}`).join(', ')}
                                        </div>
                                        <button
                                            className="btn btn-sm btn-primary quick-queue-done-btn"
                                            onClick={() => handleComplete(o.id)}
                                            disabled={completing === o.id}
                                        >
                                            {completing === o.id ? '⏳' : '✅ Done'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickOrderPage;
