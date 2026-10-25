import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/dataService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem('user'); }
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        const res = await authService.login(credentials);
        const data = res.data.data;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const isAdmin = () => user?.role === 'SUPER_ADMIN';
    const isManager = () => user?.role === 'SHOP_MANAGER';
    const isOperator = () => user?.role === 'SHOP_OPERATOR';
    const hasRole = (...roles) => roles.includes(user?.role);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager, isOperator, hasRole }}>
            {children}
        </AuthContext.Provider>
    );
};
