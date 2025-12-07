'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FaBars,
  FaTimes,
  FaHome,
  FaCompass,
  FaUser,
  FaMicrophone,
  FaBell,
  FaSearch,
  FaHeadphones
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/Navbar.module.css';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/useAuth';
import axiosInstance from '@/utils/axiosInstance';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const { push } = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (path) => pathname === path;

  const navItems = [
    { id: 'explore', label: 'Explore', path: '/explore', icon: FaCompass },
    { id: 'listen', label: 'Listen', path: '/listen', icon: FaHeadphones },
    { id: 'upload', label: 'Upload', path: '/upload', icon: FaMicrophone }
  ];

  const mobileNavItems = user ? navItems : navItems.filter((item) => item.id !== 'listen');

  const handleNavClick = (path) => {
    push(path);
    setIsMobileMenuOpen(false);

    // Close the mobile menu if it's open
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (isOffline) {
        alert('You are currently offline. Please check your connection and try again.');
        return;
      }

      await axiosInstance.post('/api/auth/logout');
      await logout();
      push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleOnlineStatus = () => setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Initial check
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  return (
    <>
      <motion.nav
        className={styles.navbar}
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 120 }}
      >
        {isOffline && (
          <div className={styles.offlineIndicator}>You are offline. Some features may be unavailable.</div>
        )}

        <div className={styles.navContainer}>
          {/* Left section with page indicator instead of logo */}
          <div className={styles.leftSection}>
            <motion.div
              className={styles.pageIndicator}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <FaMicrophone className={styles.pageIcon} />
              <span className={styles.pageName}>
                {isActive('/') && 'Home'}
                {isActive('/explore') && 'Explore'}
                {isActive('/profile') && 'Profile'}
                {isActive('/listen') && 'Listen'}
                {isActive('/upload') && 'Upload'}
                {isActive('/settings') && 'Settings'}
                {!isActive('/') && !isActive('/explore') && !isActive('/profile') && !isActive('/listen') && !isActive('/upload') && !isActive('/settings') && 'Sayings'}
              </span>
            </motion.div>
          </div>

          {/* Center section with icons */}
          <div className={styles.centerSection}>
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                onClick={() => handleNavClick(item.path)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                aria-label={item.label}
                aria-current={isActive(item.path) ? 'page' : undefined}
              >
                <span className={styles.navLink}>
                  <span className={styles.icon}><item.icon /></span>
                </span>
                {isActive(item.path) && <div className={styles.activeIndicator} />}
              </motion.button>
            ))}
          </div>

          {/* Right section with search and user actions */}
          <div className={styles.rightSection}>
            {/* Search Bar */}
            <div className={styles.searchContainer}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search..."
                className={styles.searchInput}
                aria-label="Search"
              />
            </div>

            {/* User Actions */}
            <div className={styles.userActions}>
              {user ? (
                <>
                  {/* Notification Button */}
                  <motion.button
                    className={styles.iconButton}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FaBell />
                    <span className={styles.notificationBadge}>3</span>
                  </motion.button>

                  {/* Record Button */}
                  <Link href="/record" className={styles.recordButton}>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={styles.recordButtonInner}
                    >
                      <FaMicrophone />
                      <span>Record</span>
                    </motion.div>
                  </Link>

                  {/* User Avatar / Profile */}
                  <Link href="/profile">
                    <motion.div
                      className={styles.avatar}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt="Profile" />
                      ) : (
                        <div className={styles.defaultAvatar}>
                          {user.name ? user.name.charAt(0) : 'U'}
                        </div>
                      )}
                    </motion.div>
                  </Link>
                </>
              ) : (
                <div className={styles.authButtons}>
                  <motion.button
                    className={styles.loginButton}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => push('/login')}
                  >
                    Log In
                  </motion.button>
                  <motion.button
                    className={styles.signupButton}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => push('/register')}
                  >
                    Sign Up
                  </motion.button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <motion.button
              className={styles.mobileMenuToggle}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
              whileTap={{ scale: 0.95 }}
            >
              <FaBars />
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu (Off Canvas) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              className={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsMobileMenuOpen(false)}
            ></motion.div>

            {/* Mobile Drawer */}
            <motion.div
              className={styles.mobileNav}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
            >
              <div className={styles.mobileNavHeader}>
                <Link href="/" className={styles.mobileLogo} onClick={() => handleNavClick('/')}>
                  <div className={styles.logoIcon}>
                    <FaMicrophone />
                  </div>
                  <span>Sayings</span>
                </Link>
                <motion.button
                  className={styles.closeButton}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close menu"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FaTimes />
                </motion.button>
              </div>

              <div className={styles.mobileNavItems}>
                {mobileNavItems.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      href={item.path}
                      className={`${styles.mobileNavItem} ${isActive(item.path) ? styles.mobileNavItemActive : ''}`}
                      aria-current={isActive(item.path) ? 'page' : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon size={20} />
                      <span>{item.id === 'listen' ? 'Listen Along' : item.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Search in mobile menu */}
              <div className={styles.mobileSearchContainer}>
                <FaSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search..."
                  className={styles.mobileSearchInput}
                />
              </div>

              {/* Auth buttons in mobile menu */}
              <div className={styles.mobileAuthContainer}>
                {user ? (
                  <motion.button
                    className={styles.signupButton}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                  >
                    Logout
                  </motion.button>
                ) : (
                  <div className={styles.authButtons}>
                    <motion.button
                      className={styles.loginButton}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        push('/login');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Log In
                    </motion.button>
                    <motion.button
                      className={styles.signupButton}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        push('/register');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Sign Up
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(Navbar);
