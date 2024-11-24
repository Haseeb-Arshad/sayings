// components/ProtectedRoute.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from '../utils/axiosInstance';

const ProtectedRoute = (WrappedComponent) => {
  return (props) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
      const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
        } else {
          try {
            await axios.get('/auth/me');
            setIsAuthenticated(true);
          } catch (err) {
            console.error('Auth check failed:', err);
            router.push('/login');
          }
        }
        setLoading(false);
      };

      checkAuth();
    }, [router]);

    if (loading) {
      return <p>Loading...</p>;
    }

    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
};

export default ProtectedRoute;
