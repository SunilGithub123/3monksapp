import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NewOrderPage from './pages/NewOrderPage';
import QuickOrderPage from './pages/QuickOrderPage';
import OrderQueuePage from './pages/OrderQueuePage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import StockPage from './pages/StockPage';
import PurchasesPage from './pages/PurchasesPage';
import ReportsPage from './pages/ReportsPage';
import ShopsPage from './pages/ShopsPage';
import ProductsPage from './pages/ProductsPage';
import FruitsPage from './pages/FruitsPage';
import RawMaterialsPage from './pages/RawMaterialsPage';
import UsersPage from './pages/UsersPage';
import EmployeesPage from './pages/EmployeesPage';
import RecipesPage from './pages/RecipesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import FeedbacksPage from './pages/FeedbacksPage';
import FranchiseEnquiriesPage from './pages/FranchiseEnquiriesPage';
import DataResetPage from './pages/DataResetPage';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected Dashboard Routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                        <Route index element={<DashboardPage />} />

                        {/* Orders - all authenticated users */}
                        <Route path="orders/new" element={<NewOrderPage />} />
                        <Route path="orders/quick" element={<QuickOrderPage />} />
                        <Route path="orders/queue" element={<OrderQueuePage />} />
                        <Route path="orders" element={<OrderHistoryPage />} />

                        {/* Inventory - Admin & Manager */}
                        <Route path="stock" element={
                            <ProtectedRoute roles={['SUPER_ADMIN', 'SHOP_MANAGER']}><StockPage /></ProtectedRoute>
                        } />
                        <Route path="purchases" element={
                            <ProtectedRoute roles={['SUPER_ADMIN', 'SHOP_MANAGER']}><PurchasesPage /></ProtectedRoute>
                        } />

                        {/* Reports - Admin & Manager */}
                        <Route path="reports" element={
                            <ProtectedRoute roles={['SUPER_ADMIN', 'SHOP_MANAGER']}><ReportsPage /></ProtectedRoute>
                        } />

                        {/* Admin only */}
                        <Route path="shops" element={
                            <ProtectedRoute roles={['SUPER_ADMIN']}><ShopsPage /></ProtectedRoute>
                        } />
                        <Route path="products" element={
                            <ProtectedRoute roles={['SUPER_ADMIN']}><ProductsPage /></ProtectedRoute>
                        } />
                        <Route path="fruits" element={
                            <ProtectedRoute roles={['SUPER_ADMIN']}><FruitsPage /></ProtectedRoute>
                        } />
                        <Route path="raw-materials" element={
                            <ProtectedRoute roles={['SUPER_ADMIN']}><RawMaterialsPage /></ProtectedRoute>
                        } />
                        <Route path="users" element={
                            <ProtectedRoute roles={['SUPER_ADMIN']}><UsersPage /></ProtectedRoute>
                        } />
                        <Route path="employees" element={
                            <ProtectedRoute roles={['SUPER_ADMIN']}><EmployeesPage /></ProtectedRoute>
                        } />
                        <Route path="recipes" element={
                            <ProtectedRoute roles={['SUPER_ADMIN']}><RecipesPage /></ProtectedRoute>
                        } />
                        <Route path="analytics" element={
                            <ProtectedRoute roles={['SUPER_ADMIN']}><AnalyticsPage /></ProtectedRoute>
                        } />
                        <Route path="feedbacks" element={
                            <ProtectedRoute roles={['SUPER_ADMIN']}><FeedbacksPage /></ProtectedRoute>
                        } />
                        <Route path="franchise-enquiries" element={
                            <ProtectedRoute roles={['SUPER_ADMIN']}><FranchiseEnquiriesPage /></ProtectedRoute>
                        } />
                        <Route path="data-reset" element={
                            <ProtectedRoute roles={['SUPER_ADMIN']}><DataResetPage /></ProtectedRoute>
                        } />
                    </Route>

                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
