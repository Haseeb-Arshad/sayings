// components/Navbar.jsx

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FaBars,
  FaTimes,
  FaHome,
  FaCompass,
  FaUser,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/Navbar.module.css';
import { useRouter } from 'next/navigation';
import SearchBar from './searchBar';
import Notifications from './notifications';
import { useAuth } from '../context/useAuth';
import axiosInstance from '@/utils/axiosInstance';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', path: '/', icon: <FaHome /> },
    { id: 'explore', label: 'Explore', path: '/explore', icon: <FaCompass /> },
    { id: 'profile', label: 'Profile', path: '/profile', icon: <FaUser /> },
    { id: 'settings', label: 'Settings', path: '/settings', icon: <FaUser /> },
  ];

  const isActive = (path) => router.pathname === path;

  const handleNavClick = (path) => {
    if (isActive(path)) {
      // Optional: Refresh functionality
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Optionally, display an error message to the user
    }
  };

  // Framer Motion Variants for Mobile Menu
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 0.5 },
    exit: { opacity: 0 },
  };

  const drawerVariants = {
    hidden: { x: '100%' },
    visible: { x: '0%' },
    exit: { x: '100%' },
  };

  const menuItemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05 },
    }),
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
          <>
            {/* Overlay */}
            <motion.div
              className={styles.overlay}
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setIsMobileMenuOpen(false)}
              transition={{ duration: 0.3 }}
            />

            {/* Sliding Drawer */}
            <motion.div
              className={styles.mobileDrawer}
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className={styles.mobileHeader}>
                <Link href="/" className={styles.mobileLogo} onClick={() => handleNavClick('/')}>
                  Sayings.
                </Link>
                <button
                  className={styles.closeButton}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <motion.ul
                className={styles.mobileNavList}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                {navItems.map((item, index) => (
                  <motion.li
                    key={item.id}
                    custom={index}
                    variants={menuItemVariants}
                    className={styles.mobileNavItem}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <Link href={item.path} className={styles.mobileNavLink}>
                      <span className={styles.icon}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>

              {/* Authentication Links */}
              <div className={styles.mobileAuth}>
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default React.memo(Navbar);
