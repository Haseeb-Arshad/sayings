// hooks/useCurrentUser.js

import { useState, useEffect } from 'react';
import axios from '../utils/axiosInstance';

const useCurrentUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  return { user, loading };
};

export default useCurrentUser;
