// components/Navbar.jsx

'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import {
  FaBars,
  FaTimes,
  FaHome,
  FaCompass,
  FaUser,
  FaSearch,
  FaBell,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/Navbar.module.css';
import { useRouter } from 'next/navigation';
import SearchBar from './searchBar';
import Notifications from './notifications';
import { useAuth } from '../context/useAuth'; // Import the Auth Context
import axiosInstance from '@/utils/axiosInstance';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth(); // Consume the Auth Context

  const navItems = [
    { id: 'home', label: 'Home', path: '/', icon: <FaHome /> },
    { id: 'explore', label: 'Explore', path: '/explore', icon: <FaCompass /> },
    { id: 'profile', label: 'Profile', path: '/profile', icon: <FaUser /> },
  ];

  const isActive = (path) => router.pathname === path;

  const handleNavClick = (path) => {
    if (isActive(path)) {
      // If already on the current page, trigger a refresh (if applicable)
      // For example, you can implement a refreshPosts function in your context
      // refreshPosts();
    }
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout'); // Ensure axios is imported or use the instance
      logout(); // Update Auth Context
      router.push('/login'); // Redirect to login page
    } catch (error) {
      console.error('Logout failed:', error);
      // Optionally, display an error message to the user
    }
  };

  return (
    <motion.nav
      className={styles.navbar}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      <div className={styles.navContainer}>
        <div className={styles.leftSection}>
          <motion.div
            className={styles.logoWrapper}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link href="/" className={styles.logo} onClick={() => handleNavClick('/')}>
              Sayings.
            </Link>
          </motion.div>
          <SearchBar />
        </div>

        <div className={styles.centerSection}>
          {navItems.map((item) => (
            <Link
              href={item.path}
              key={item.id}
              className={`${styles.navLink} ${isActive(item.path) ? styles.active : ''}`}
              onClick={() => handleNavClick(item.path)}
            >
              <motion.div
                className={styles.navItem}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive(item.path) && (
                  <motion.div
                    className={styles.activeIndicator}
                    layoutId="activeIndicator"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          ))}
        </div>

        <div className={styles.rightSection}>
          <Notifications />

          {/* Conditionally render Login/Signup or Logout buttons */}
          {user ? (
            <motion.button
              className={styles.authButton}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
            >
              Logout
            </motion.button>
          ) : (
            <div className={styles.authButtons}>
              <Link href="/login">
                <motion.button
                  className={styles.authButton}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Login
                </motion.button>
              </Link>
              <Link href="/register">
                <motion.button
                  className={`${styles.authButton} ${styles.signupButton}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Signup
                </motion.button>
              </Link>
            </div>
          )}

          <motion.button
            className={styles.mobileMenuButton}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className={`${styles.mobileMenu} ${
              isMobileMenuOpen ? styles.open : styles.closed
            }`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <SearchBar isMobile={true} />
            {navItems.map((item) => (
              <Link
                href={item.path}
                key={item.id}
                className={styles.mobileNavLink}
                onClick={() => handleNavClick(item.path)}
              >
                <motion.div
                  className={styles.mobileNavItem}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className={styles.icon}>{item.icon}</span>
                  <span>{item.label}</span>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default React.memo(Navbar); // Use React.memo to prevent unnecessary re-renders
