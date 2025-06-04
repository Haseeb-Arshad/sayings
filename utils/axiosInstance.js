import axios from 'axios';

// Create a custom axios instance with configuration
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Constants for error handling
let lastErrorLoggedAt = 0;
const ERROR_LOG_THROTTLE_MS = 3000;
let isOffline = false;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Check network status
if (typeof window !== 'undefined') {
  isOffline = !navigator.onLine;
  
  window.addEventListener('online', () => {
    isOffline = false;
    console.log('Application is back online');
    // Could dispatch an event here to notify components
  });
  
  window.addEventListener('offline', () => {
    isOffline = true;
    console.log('Application is offline');
  });
}

// Helper function to delay execution (for retries)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Request interceptor - adds auth token and handles offline state
axiosInstance.interceptors.request.use(
  async (config) => {
    // Check if we're offline before attempting the request
    if (typeof window !== 'undefined' && !navigator.onLine) {
      // If it's a GET request and we have cached data, we could return it here
      // For now, just reject with a custom error
      return Promise.reject({ 
        isOfflineError: true, 
        message: 'You are currently offline. Please check your connection.',
        config
      });
    }
    
    // Add authorization token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handles errors and retry logic
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Don't retry canceled requests
    if (axios.isCancel(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }
    
    // Don't log or retry silent requests
    if (error.config && error.config.silent) {
      return Promise.reject(error);
    }
    
    // Handle offline errors from our request interceptor
    if (error.isOfflineError) {
      console.warn('Request attempted while offline:', error.config.url);
      return Promise.reject({
        response: { status: 0 },
        message: error.message,
        isOffline: true
      });
    }
    
    // Network errors - could be server down or client offline
    if (error.message && (
        error.message.includes('Network Error') || 
        !error.response || 
        error.code === 'ECONNABORTED'
      )) {
      // Update offline status if we detect a network error
      if (typeof window !== 'undefined') {
        isOffline = !navigator.onLine;
      }
      
      // Retry logic for idempotent requests (GET, HEAD, OPTIONS)
      const config = error.config;
      if (config && ['get', 'head', 'options'].includes(config.method.toLowerCase())) {
        if (!config.retryCount) {
          config.retryCount = 0;
        }
        
        if (config.retryCount < MAX_RETRIES) {
          config.retryCount++;
          
          // Wait before retrying
          await delay(RETRY_DELAY * config.retryCount);
          
          console.log(`Retrying request to ${config.url} (attempt ${config.retryCount})`);
          return axiosInstance(config);
        }
      }
      
      // If we get here, we've either exhausted retries or the request isn't retryable
      return Promise.reject({
        ...error,
        message: isOffline ? 
          'You appear to be offline. Please check your connection.' : 
          'Unable to connect to the server. Please try again later.',
        isOffline
      });
    }
    
    // Throttle error logging to prevent flooding the console
    const now = Date.now();
    if (now - lastErrorLoggedAt > ERROR_LOG_THROTTLE_MS) {
      console.error('Axios Error:', {
        message: error.message,
        url: error.config?.url,
        method: error.config?.method,
        response: error.response?.data,
        status: error.response?.status
      });
      lastErrorLoggedAt = now;
    }
    
    // Handle authentication errors
    if (error.response?.status === 401 && !error.config?.url?.includes('/login')) {
      // Clear token and redirect to login if not already there
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?session=expired';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Export functions to check network status
export const isNetworkOffline = () => isOffline;

// Main axios instance export
export default axiosInstance;
