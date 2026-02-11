import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth Services
export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
};

// Project Services
export const projectService = {
    getAll: async (filters = {}) => {
        const response = await api.get('/projects', { params: filters });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/projects/${id}`);
        return response.data;
    },

    create: async (projectData) => {
        const response = await api.post('/projects', projectData);
        return response.data;
    },

    update: async (id, updates) => {
        const response = await api.put(`/projects/${id}`, updates);
        return response.data;
    },

    updateStatus: async (id, status) => {
        const response = await api.put(`/projects/${id}/status`, { status });
        return response.data;
    },

    getActivity: async (id) => {
        const response = await api.get(`/projects/${id}/activity`);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/projects/${id}`);
        return response.data;
    },

    updateDeliverableStatus: async (id, status) => {
        const response = await api.patch(`/deliverables/${id}/status`, { status });
        return response.data;
    },
};

// Template Services
export const templateService = {
    getAll: async () => {
        const response = await api.get('/templates');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/templates/${id}`);
        return response.data;
    },

    create: async (templateData) => {
        const response = await api.post('/templates', templateData);
        return response.data;
    },
};

// Deliverable Services
export const deliverableService = {
    getByProject: async (projectId) => {
        const response = await api.get(`/deliverables/project/${projectId}`);
        return response.data;
    },

    getByUser: async (userId) => {
        const response = await api.get(`/deliverables/user/${userId}`);
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/deliverables/${id}`);
        return response.data;
    },

    create: async (deliverableData) => {
        const response = await api.post('/deliverables', deliverableData);
        return response.data;
    },

    update: async (id, updates) => {
        const response = await api.put(`/deliverables/${id}`, updates);
        return response.data;
    },

    generateWithAI: async (id) => {
        const response = await api.post(`/deliverables/${id}/generate`);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/deliverables/${id}`);
        return response.data;
    },
};

export default api;
