import axios from 'axios';

// Default to localhost:5000 if not specified in env
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('docuscreen_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add interceptors for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and user session on unauthorized
      localStorage.removeItem('docuscreen_token');
      localStorage.removeItem('docuscreen_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    console.error('API Error:', error.response?.data || error.message);
    const customError = new Error(error.response?.data?.error?.message || error.response?.data?.message || 'An unexpected error occurred while communicating with the server.');
    customError.code = error.response?.data?.error?.code || 'UNKNOWN';
    customError.status = error.response?.status;
    return Promise.reject(customError);
  }
);
