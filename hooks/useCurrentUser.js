// hooks/useCurrentUser.js

import { useState, useEffect } from 'react';
import axios from '../utils/axiosInstance';

const useCurrentUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // offline: true if navigator reports no connectivity
  const [offline, setOffline] = useState(!navigator.onLine);

  const fetchUser = async () => {
    const devAutoLogin = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true';
    if (devAutoLogin) {
      setUser({ id: 'dev', username: 'devuser', email: 'dev@example.com' });
      setLoading(false);
      return;
    }

    if (!navigator.onLine) {
      setOffline(true);
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();

    const handleOnline = () => {
      setOffline(false);
      setLoading(true);
      fetchUser();
    };
    const handleOffline = () => {
      setOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, loading, offline };
};

export default useCurrentUser;
