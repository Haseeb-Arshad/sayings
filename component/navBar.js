'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FaBars,
  FaBell,
  FaCompass,
  FaHeadphones,
  FaMicrophone,
  FaSearch,
  FaFileAlt,
  FaTimes
} from 'react-icons/fa';
import styles from '../styles/Navbar.module.css';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/useAuth';
import axiosInstance from '@/utils/axiosInstance';
import SearchModal from './SearchModal';
import { motion, AnimatePresence } from 'framer-motion';

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
    { id: 'drafts', label: 'Drafts', path: '/drafts', icon: FaFileAlt },
    { id: 'upload', label: 'Upload', path: '/upload', icon: FaMicrophone }
  ];

  const mobileNavItems = user ? navItems : navItems.filter((item) => item.id !== 'listen' && item.id !== 'drafts');

  const handleNavClick = (path) => {
    push(path);
    setIsMobileMenuOpen(false);
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
    const handleOnlineStatus = () => setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  return (
    <>
      <nav className={styles.navbar}>
        {isOffline && (
          <div className={styles.offlineIndicator}>
            You are offline. Some features may be unavailable.
          </div>
        )}

        <div className={styles.navContainer}>
          <div className={styles.leftSection}>
            <div className={styles.pageIndicator}>
              <FaMicrophone className={styles.pageIcon} />
              <span className={styles.pageName}>
                {isActive('/') && 'Home'}
                {isActive('/explore') && 'Explore'}
                {isActive('/profile') && 'Profile'}
                {isActive('/listen') && 'Listen'}
                {isActive('/drafts') && 'Drafts'}
                {isActive('/upload') && 'Upload'}
                {isActive('/settings') && 'Settings'}
                {!isActive('/') && !isActive('/explore') && !isActive('/profile') && !isActive('/listen') && !isActive('/drafts') && !isActive('/upload') && !isActive('/settings') && 'Sayings'}
              </span>
            </div>
          </div>

          <div className={styles.centerSection}>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                onClick={() => handleNavClick(item.path)}
                aria-label={item.label}
                aria-current={isActive(item.path) ? 'page' : undefined}
              >
                <span className={styles.navLink}>
                  <span className={styles.icon}>
                    <item.icon />
                  </span>
                </span>
                {isActive(item.path) && <div className={styles.activeIndicator} />}
              </button>
            ))}
          </div>

          <div className={styles.rightSection}>
            <div className={styles.searchContainer}>
              <SearchModal />
            </div>

            <div className={styles.userActions}>
              {user ? (
                <>
                  <button type="button" className={styles.iconButton} aria-label="Notifications">
                    <FaBell />
                    <span className={styles.notificationBadge}>3</span>
                  </button>

                  <Link href="/record" className={styles.recordButton}>
                    <div className={styles.recordButtonInner}>
                      <FaMicrophone />
                      <span>Record</span>
                    </div>
                  </Link>

                  <Link href="/profile" aria-label="Go to profile">
                    <div className={styles.avatar}>
                      {user.avatar ? (
                        <img src={user.avatar} alt="Profile" />
                      ) : (
                        <div className={styles.defaultAvatar}>
                          {user.name ? user.name.charAt(0) : 'U'}
                        </div>
                      )}
                    </div>
                  </Link>
                </>
              ) : (
                <div className={styles.authButtons}>
                  <button
                    type="button"
                    className={styles.loginButton}
                    onClick={() => push('/login')}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    className={styles.signupButton}
                    onClick={() => push('/register')}
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className={styles.mobileMenuToggle}
              onClick={() => setIsMobileMenuOpen((s) => !s)}
              aria-label="Toggle mobile menu"
            >
              <FaBars />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              className={styles.overlay}
              onClick={() => setIsMobileMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              className={styles.mobileNav}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className={styles.mobileNavHeader}>
                <Link
                  href="/"
                  className={styles.mobileLogo}
                  onClick={() => handleNavClick('/')}
                >
                  <div className={styles.logoIcon}>
                    <FaMicrophone />
                  </div>
                  <span>Sayings</span>
                </Link>

                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <FaTimes />
                </button>
              </div>

              <div className={styles.mobileNavItems}>
                {mobileNavItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={`${styles.mobileNavItem} ${isActive(item.path) ? styles.mobileNavItemActive : ''
                      }`}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon size={20} />
                    <span>{item.id === 'listen' ? 'Listen Along' : item.label}</span>
                  </Link>
                ))}
              </div>

              <div className={styles.mobileSearchContainer}>
                <FaSearch className={styles.searchIcon} />
                <button
                  type="button"
                  className={styles.mobileSearchInput}
                  onClick={() => {
                    document.dispatchEvent(new Event('search:open'));
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Search...
                </button>
              </div>

              <div className={styles.mobileAuthContainer}>
                {user ? (
                  <button
                    type="button"
                    className={styles.signupButton}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                ) : (
                  <div className={styles.authButtons}>
                    <button
                      type="button"
                      className={styles.loginButton}
                      onClick={() => {
                        push('/login');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Log In
                    </button>
                    <button
                      type="button"
                      className={styles.signupButton}
                      onClick={() => {
                        push('/register');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Sign Up
                    </button>
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
