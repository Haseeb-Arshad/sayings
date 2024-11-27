import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://sayings-backend.onrender.com/api', // Now includes /api at the end
  withCredentials: true,
});

axiosInstance.interceptors.request.use(


  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    console.log("token", token)
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
    console.error('Axios Interceptor Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.config?.headers
    });
    return Promise.reject(error);
  }
);

export default axiosInstance;
