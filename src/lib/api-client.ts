import axios from 'axios';

export const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Automatically attach Bearer token to all requests
apiClient.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Automatically handle unauthorized session drops
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined' && error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('active_location_id');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);