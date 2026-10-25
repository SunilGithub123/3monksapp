import api from './api';

export const authService = {
    login: (credentials) => api.post('/api/auth/login', credentials),
};

export const publicService = {
    getMenu: () => api.get('/api/public/menu'),
    getShots: () => api.get('/api/public/menu/shots'),
    getCreamyBlends: () => api.get('/api/public/menu/creamy-blends'),
    getCuratedBlends: () => api.get('/api/public/menu/curated-blends'),
    getFruits: () => api.get('/api/public/fruits'),
    getShops: () => api.get('/api/public/shops'),
    submitFeedback: (data) => api.post('/api/public/feedback', data),
    submitFranchiseEnquiry: (data) => api.post('/api/public/franchise-enquiry', data),
};

export const adminService = {
    // Shops
    getShops: () => api.get('/api/admin/shops'),
    createShop: (data) => api.post('/api/admin/shops', data),
    updateShop: (id, data) => api.put(`/api/admin/shops/${id}`, data),
    toggleShop: (id) => api.patch(`/api/admin/shops/${id}/toggle`),
    // Users
    getUsers: () => api.get('/api/admin/users'),
    createUser: (data) => api.post('/api/admin/users', data),
    toggleUser: (id) => api.patch(`/api/admin/users/${id}/toggle`),
    // Fruits
    getFruits: () => api.get('/api/public/fruits'),
    createFruit: (data) => api.post('/api/admin/fruits', data),
    updateFruit: (id, data) => api.put(`/api/admin/fruits/${id}`, data),
    toggleFruit: (id) => api.patch(`/api/admin/fruits/${id}/toggle`),
    // Products
    getProducts: () => api.get('/api/admin/products'),
    createProduct: (data) => api.post('/api/admin/products', data),
    updateProduct: (id, data) => api.put(`/api/admin/products/${id}`, data),
    toggleProduct: (id) => api.patch(`/api/admin/products/${id}/toggle`),
    uploadProductImage: (id, file) => {
        const formData = new FormData();
        formData.append('image', file);
        return api.post(`/api/admin/products/${id}/image`, formData, {
            headers: { 'Content-Type': undefined },
        });
    },
    deleteProductImage: (id) => api.delete(`/api/admin/products/${id}/image`),
    // Raw Materials
    getRawMaterials: () => api.get('/api/admin/raw-materials'),
    createRawMaterial: (data) => api.post('/api/admin/raw-materials', data),
    updateRawMaterial: (id, data) => api.put(`/api/admin/raw-materials/${id}`, data),
    toggleRawMaterial: (id) => api.patch(`/api/admin/raw-materials/${id}/toggle`),
    // Recipes
    getRecipes: () => api.get('/api/admin/recipes'),
    getRecipesByProduct: (productId) => api.get(`/api/admin/recipes/product/${productId}`),
    createRecipe: (data) => api.post('/api/admin/recipes', data),
    updateRecipe: (id, data) => api.put(`/api/admin/recipes/${id}`, data),
    deleteRecipe: (id) => api.delete(`/api/admin/recipes/${id}`),
    // Employees
    getEmployees: () => api.get('/api/admin/employees'),
    getEmployeesByShop: (shopId) => api.get(`/api/admin/employees/shop/${shopId}`),
    createEmployee: (data) => api.post('/api/admin/employees', data),
    updateEmployee: (id, data) => api.put(`/api/admin/employees/${id}`, data),
    toggleEmployee: (id) => api.patch(`/api/admin/employees/${id}/toggle`),
    // Salary Sheet
    getSalarySheet: (shopId, month) => api.get('/api/admin/salary-sheet', { params: { shopId, month } }),
    // Delete purchase (admin only)
    deletePurchase: (id) => api.delete(`/api/admin/purchases/${id}`),
    // Feedbacks
    getFeedbacks: () => api.get('/api/admin/feedbacks'),
    deleteFeedback: (id) => api.delete(`/api/admin/feedbacks/${id}`),
    // Franchise Enquiries
    getFranchiseEnquiries: () => api.get('/api/admin/franchise-enquiries'),
    deleteFranchiseEnquiry: (id) => api.delete(`/api/admin/franchise-enquiries/${id}`),
    // Data Reset
    resetOrders: () => api.delete('/api/admin/reset/orders'),
    resetPurchases: () => api.delete('/api/admin/reset/purchases'),
    resetStock: () => api.delete('/api/admin/reset/stock'),
    resetFeedbacks: () => api.delete('/api/admin/reset/feedbacks'),
    resetFranchiseEnquiries: () => api.delete('/api/admin/reset/franchise-enquiries'),
    resetEmployees: () => api.delete('/api/admin/reset/employees'),
    resetAll: () => api.delete('/api/admin/reset/all'),
};

export const managerService = {
    getShopUsers: (shopId) => api.get(`/api/manager/shop/${shopId}/users`),
    createUser: (data) => api.post('/api/manager/users', data),
    getShopStock: (shopId) => api.get(`/api/manager/shop/${shopId}/stock`),
    addStock: (data) => api.post('/api/manager/stock', data),
    updateStock: (id, data) => api.put(`/api/manager/stock/${id}`, data),
    getLowStock: (shopId) => api.get(`/api/manager/shop/${shopId}/stock/low`),
    createPurchase: (data) => api.post('/api/manager/purchases', data),
    getShopPurchases: (shopId) => api.get(`/api/manager/shop/${shopId}/purchases`),
};

export const orderService = {
    createOrder: (data) => api.post('/api/orders', data),
    getOrder: (id) => api.get(`/api/orders/${id}`),
    getOrderByNumber: (num) => api.get(`/api/orders/number/${num}`),
    getShopOrders: (shopId) => api.get('/api/orders', { params: { shopId } }),
    getTodayOrders: (shopId) => api.get('/api/orders/today', { params: { shopId } }),
    getPendingOrders: (shopId) => api.get('/api/orders/pending', { params: { shopId } }),
    getOrdersByRange: (shopId, from, to) => api.get('/api/orders/range', { params: { shopId, from, to } }),
    cancelOrder: (id) => api.patch(`/api/orders/${id}/cancel`),
    completeOrder: (id) => api.patch(`/api/orders/${id}/complete`),
};

export const dashboardService = {
    getAdminDashboard: (from, to) => api.get('/api/dashboard/admin', { params: { from, to } }),
    getShopDashboard: (shopId, from, to) => api.get(`/api/dashboard/shop/${shopId}`, { params: { from, to } }),
    getProfitLoss: (shopId, from, to) => api.get('/api/dashboard/profit-loss', { params: { shopId, from, to } }),
    getAnalytics: (from, to) => api.get('/api/dashboard/analytics', { params: { from, to } }),
};

export const exportService = {
    downloadOrders: (from, to) => api.get('/api/admin/export/orders', {
        params: { from, to },
        responseType: 'blob',
    }),
    downloadPurchases: (from, to) => api.get('/api/admin/export/purchases', {
        params: { from, to },
        responseType: 'blob',
    }),
};
