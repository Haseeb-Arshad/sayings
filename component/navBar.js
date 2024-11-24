// components/Navbar.js

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import styles from './../styles/Navbar.module.css';
import { motion } from 'framer-motion';
import SearchBar from './searchBar';
import Notifications from './notifications';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo}>
          VoiceSocial
        </Link>
        <div className={styles.navLinks}>
          <Link href="/" className={styles.navLink}>
            Home
          </Link>
          <Link href="/explore" className={styles.navLink}>
            Explore
          </Link>
          <Link href="/profile" className={styles.navLink}>
            Profile
          </Link>
          <SearchBar />
          <Notifications />
        </div>
        <div className={styles.mobileMenuIcon} onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </div>
      </div>
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          className={styles.mobileMenu}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link href="/" className={styles.mobileNavLink} onClick={toggleMobileMenu}>
            Home
          </Link>
          <Link href="/explore" className={styles.mobileNavLink} onClick={toggleMobileMenu}>
            Explore
          </Link>
          <Link href="/profile" className={styles.mobileNavLink} onClick={toggleMobileMenu}>
            Profile
          </Link>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
