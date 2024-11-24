// // utils/axiosInstance.js

// import axios from 'axios';

// const axiosInstance = axios.create({
//   baseURL: "http://localhost:5000",
//   withCredentials: true, // Ensure cookies are sent with every request

// });

// // Add a request interceptor to include the token
// axiosInstance.interceptors.request.use(
//   (config) => {
//     const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
//     if (token) {
//       config.headers['Authorization'] = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// export default axiosInstance;

// utils/axiosInstance.js

import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true, // Ensure cookies are sent with every request
});

export default axiosInstance;

