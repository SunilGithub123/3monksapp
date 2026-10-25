import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitials, roleLabels } from '../utils/helpers';
import { FiHome, FiShoppingCart, FiPackage, FiUsers, FiBarChart2, FiLogOut, FiBox, FiLayers, FiMapPin, FiUserCheck, FiList, FiTrendingUp, FiX, FiMessageSquare, FiBriefcase, FiZap, FiClock, FiRefreshCw } from 'react-icons/fi';

const Sidebar = ({ isOpen, onClose, collapsed }) => {
    const { user, logout, isAdmin, isManager, hasRole } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleNavClick = () => {
        if (onClose) onClose();
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

            <div className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <img src="/logo.svg" alt="3Monks" className="sidebar-logo" />
                    <div className="sidebar-brand">
                        <div className="sidebar-brand-name">3<span>Monks</span></div>
                        <div className="sidebar-brand-tagline">Fresh Fruit Bar</div>
                    </div>
                    <button className="sidebar-close-btn" onClick={onClose}><FiX /></button>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/dashboard" end className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}>
                        <FiHome /> Dashboard
                    </NavLink>

                    <div className="sidebar-section">Orders</div>
                    <NavLink to="/dashboard/orders/quick" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiZap /> Quick Order</NavLink>
                    <NavLink to="/dashboard/orders/queue" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiClock /> Order Queue</NavLink>
                    <NavLink to="/dashboard/orders/new" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiShoppingCart /> New Order</NavLink>
                    <NavLink to="/dashboard/orders" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiLayers /> Order History</NavLink>

                    {hasRole('SUPER_ADMIN', 'SHOP_MANAGER') && (
                        <>
                            <div className="sidebar-section">Inventory</div>
                            <NavLink to="/dashboard/stock" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiPackage /> Stock</NavLink>
                            <NavLink to="/dashboard/purchases" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiBox /> Purchases</NavLink>
                        </>
                    )}

                    {hasRole('SUPER_ADMIN', 'SHOP_MANAGER') && (
                        <>
                            <div className="sidebar-section">Reports</div>
                            <NavLink to="/dashboard/reports" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiBarChart2 /> Reports</NavLink>
                            {isAdmin() && (
                                <NavLink to="/dashboard/analytics" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiTrendingUp /> Analytics</NavLink>
                            )}
                        </>
                    )}

                    {isAdmin() && (
                        <>
                            <div className="sidebar-section">Admin</div>
                            <NavLink to="/dashboard/shops" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiMapPin /> Shops</NavLink>
                            <NavLink to="/dashboard/products" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiBox /> Products</NavLink>
                            <NavLink to="/dashboard/fruits" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiPackage /> Fruits</NavLink>
                            <NavLink to="/dashboard/recipes" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiList /> Recipes</NavLink>
                            <NavLink to="/dashboard/raw-materials" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiPackage /> Raw Materials</NavLink>
                            <NavLink to="/dashboard/employees" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiUserCheck /> Employees</NavLink>
                            <NavLink to="/dashboard/users" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiUsers /> Users</NavLink>
                            <NavLink to="/dashboard/feedbacks" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiMessageSquare /> Feedbacks</NavLink>
                            <NavLink to="/dashboard/franchise-enquiries" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiBriefcase /> Franchise Enquiries</NavLink>
                            <NavLink to="/dashboard/data-reset" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleNavClick}><FiRefreshCw /> Data Reset</NavLink>
                        </>
                    )}
                </nav>

                <div className="sidebar-user">
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-avatar">{getInitials(user?.fullName)}</div>
                        <div className="sidebar-user-details">
                            <div className="sidebar-user-name">{user?.fullName}</div>
                            <div className="sidebar-user-role">{roleLabels[user?.role]}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="sidebar-logout-btn">
                        <FiLogOut /> Logout
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
