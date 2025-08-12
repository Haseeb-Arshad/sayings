// context/AuthContext.js

'use client'
import { createContext, useState, useEffect, useContext } from 'react';
import axios from '../utils/axiosInstance';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const devAutoLogin = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true';

    // In dev auto-login mode, provide a mock user and skip server call
    if (devAutoLogin) {
      setUser({ id: 'dev', username: 'devuser', email: 'dev@example.com' });
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await axios.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
