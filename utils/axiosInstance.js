import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api', // Now includes /api at the end
  withCredentials: true,
});

// Throttle variable for logging errors
let lastErrorLoggedAt = 0;
const ERROR_LOG_THROTTLE_MS = 3000;

axiosInstance.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    if (error.config && error.config.silent) {
      return Promise.reject(error);
    }

    const now = Date.now();
    if (now - lastErrorLoggedAt > ERROR_LOG_THROTTLE_MS) {
      console.error('Axios Interceptor Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.config?.headers,
      });
      lastErrorLoggedAt = now;
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
