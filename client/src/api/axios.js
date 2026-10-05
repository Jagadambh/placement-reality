import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pr_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If request body is FormData, let browser generate multipart/form-data with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Return structured error message
    const customError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred.',
      status: error.response?.status,
      errors: error.response?.data?.errors,
    };
    return Promise.reject(customError);
  }
);

export default api;
