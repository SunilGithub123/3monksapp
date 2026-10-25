import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const FLOATING_FRUITS = ['🍊', '🍓', '🥭', '🍇', '🍋', '🥝', '🫐', '🍍', '🍉', '🍌'];

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => { setMounted(true); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login({ username, password });
            toast.success('Login successful!');
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="lp-login">
            {/* Floating fruit background */}
            <div className="lp-login__floats">
                {FLOATING_FRUITS.map((fruit, i) => (
                    <span key={i} className={`lp-float lp-float--${i + 1}`}>{fruit}</span>
                ))}
            </div>

            {/* Mesh gradient overlays */}
            <div className="lp-login__mesh" />

            {/* Left branding panel */}
            <div className={`lp-login__brand ${mounted ? 'lp-login__brand--show' : ''}`}>
                <Link to="/" className="lp-login__home">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M5 12l7-7m-7 7l7 7" /></svg>
                    Back to Home
                </Link>
                <div className="lp-login__brand-inner">
                    <img src="/logo.svg" alt="3Monks" className="lp-login__brand-logo" />
                    <h1 className="lp-login__brand-title">3<em>Monks</em></h1>
                    <p className="lp-login__brand-sub">Fresh Fruit Shots & Creamy Blends</p>
                    <div className="lp-login__brand-features">
                        <div className="lp-login__brand-feat">
                            <span className="lp-login__feat-icon">📊</span>
                            <div>
                                <strong>Real-time Dashboard</strong>
                                <p>Monitor sales & inventory live</p>
                            </div>
                        </div>
                        <div className="lp-login__brand-feat">
                            <span className="lp-login__feat-icon">🧾</span>
                            <div>
                                <strong>POS & Billing</strong>
                                <p>Fast, accurate order processing</p>
                            </div>
                        </div>
                        <div className="lp-login__brand-feat">
                            <span className="lp-login__feat-icon">📦</span>
                            <div>
                                <strong>Stock Engine</strong>
                                <p>Auto daily stock management</p>
                            </div>
                        </div>
                    </div>
                </div>
                <p className="lp-login__brand-copy">&copy; 2026 3Monks. All rights reserved.</p>
            </div>

            {/* Right form panel */}
            <div className={`lp-login__form-wrap ${mounted ? 'lp-login__form-wrap--show' : ''}`}>
                <div className="lp-login__card">
                    {/* Mobile-only logo */}
                    <div className="lp-login__mobile-brand">
                        <img src="/logo.svg" alt="3Monks" />
                        <span>3<em>Monks</em></span>
                    </div>

                    <div className="lp-login__card-head">
                        <h2>Welcome back</h2>
                        <p>Sign in to your dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="lp-login__form">
                        <div className="lp-login__field">
                            <label htmlFor="username">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                autoFocus
                                autoComplete="username"
                            />
                        </div>

                        <div className="lp-login__field">
                            <label htmlFor="password">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                Password
                            </label>
                            <div className="lp-login__input-wrap">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    autoComplete="current-password"
                                />
                                <button type="button" className="lp-login__eye" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="lp-login__submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="lp-login__spinner" />
                                    Signing in…
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div> 
    );
};

export default LoginPage;
