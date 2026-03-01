import axios from 'axios';

// Auto-detect hostname so API works from phone (same network)
const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000`;

const api = axios.create({
    baseURL: `${API_BASE}/api/v1`,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

// --- Auth APIs ---
export const authApi = {
    login: (phone: string, pin: string) =>
        api.post('/auth/login', { phone, pin }),
    me: () => api.get('/auth/me'),
};

// --- Tenant APIs ---
export const tenantApi = {
    register: (data: {
        shop_name: string;
        phone: string;
        owner_name: string;
        pin: string;
        address?: string;
    }) => api.post('/tenants', data),
};

// --- User APIs ---
export const userApi = {
    list: () => api.get('/users'),
    create: (data: { name: string; phone: string; pin: string; role: string }) =>
        api.post('/users', data),
    update: (id: string, data: any) => api.patch(`/users/${id}`, data),
    deactivate: (id: string) => api.delete(`/users/${id}`),
};

// --- Customer APIs ---
export const customerApi = {
    list: (search?: string, page = 1, limit = 20) =>
        api.get('/customers', { params: { search, page, limit } }),
    get: (id: string) => api.get(`/customers/${id}`),
    create: (data: { name: string; phone?: string; address?: string; notes?: string }) =>
        api.post('/customers', data),
    update: (id: string, data: any) => api.patch(`/customers/${id}`, data),
    deactivate: (id: string) => api.delete(`/customers/${id}`),
};

// --- Product APIs ---
export const productApi = {
    list: () => api.get('/products'),
    get: (id: string) => api.get(`/products/${id}`),
    create: (data: { name: string; category: string; unit: string; initial_price: number }) =>
        api.post('/products', data),
    update: (id: string, data: any) => api.patch(`/products/${id}`, data),
    setPrice: (id: string, data: { price_per_unit: number }) =>
        api.post(`/products/${id}/prices`, data),
    priceHistory: (id: string) => api.get(`/products/${id}/prices`),
    deactivate: (id: string) => api.delete(`/products/${id}`),
};

// --- Entry APIs ---
export const entryApi = {
    list: (date: string, customerId?: string) =>
        api.get('/entries', { params: { date, customer_id: customerId } }),
    listByMonth: (month: string, customerId?: string) =>
        api.get('/entries', { params: { month, customer_id: customerId } }),
    create: (data: {
        customer_id: string;
        product_id: string;
        entry_date: string;
        quantity: number;
        entry_slot?: string;
    }) => api.post('/entries', data),
    delete: (id: string) => api.delete(`/entries/${id}`),
};

// --- Summary APIs ---
export const summaryApi = {
    list: (month: string, customerId?: string) =>
        api.get('/summaries', { params: { month, customer_id: customerId } }),
    lock: (id: string) => api.post(`/summaries/${id}/lock`),
    unlock: (id: string) => api.post(`/summaries/${id}/unlock`),
    recalculate: (month: string) =>
        api.post('/summaries/recalculate', null, { params: { month } }),
};
