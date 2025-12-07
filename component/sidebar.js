'use client';

import styles from '../styles/Sidebar.module.css';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaHome, FaBell, FaUserAlt, FaPlus, FaStar, FaBookmark, FaSearch, FaCog, FaHashtag, FaChartLine, FaFire } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const Sidebar = ({ setFilter, currentFilter }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'home', icon: FaHome, label: 'Home', path: '/' },
    { id: 'profile', icon: FaUserAlt, label: 'Profile', path: '/profile' },
    { id: 'notifications', icon: FaBell, label: 'Notifications', badge: true, disabled: true },
    { id: 'bookmarks', icon: FaBookmark, label: 'Bookmarks', disabled: true },
    { id: 'settings', icon: FaCog, label: 'Settings', path: '/settings' }
  ];

  // Filter options for topics
  const filterOptions = [
    { id: 'recent', icon: FaFire, label: 'Recent', filter: 'recent' },
    { id: 'trending', icon: FaChartLine, label: 'Trending', filter: 'trending', disabled: true },
    { id: 'technology', icon: FaHashtag, label: 'Technology', filter: 'topic:Technology' },
    { id: 'sports', icon: FaHashtag, label: 'Sports', filter: 'topic:Sports' },
    { id: 'entertainment', icon: FaHashtag, label: 'Entertainment', filter: 'topic:Entertainment' },
  ];

  const handleNavClick = (path) => {
    if (path) {
      router.push(path);
    }
  };

  const handleFilterClick = (filter) => {
    if (setFilter) {
      setFilter(filter);
    }
  };

  const handleCreatePost = () => {
    router.push('/upload');
  };

  return (
    <aside className={styles.sidebar}>
      {/* Profile Section at Top */}
      <div className={styles.profileSection}>
        <div className={styles.profileHeader}>
          <div className={styles.profileAvatar}>
            <img src="/avatar-placeholder.png" alt="Profile" />
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>tom</div>
            <div className={styles.profilePronouns}>he/him</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.sidebarNav}>
        {navItems.map(({ id, icon: Icon, label, path, badge, disabled }) => {
          const isActive = path && pathname === path;
          const handleClick = () => {
            if (path && !disabled) {
              handleNavClick(path);
            }
          };

          return (
            <motion.button
              key={id}
              type="button"
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={handleClick}
              disabled={disabled}
              whileHover={{ scale: disabled ? 1 : 1.02 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={disabled ? 'true' : undefined}
            >
              <Icon className={styles.navIcon} />
              <span className={styles.navLabel}>{label}</span>
              {badge && <div className={styles.notificationDot}></div>}
            </motion.button>
          );
        })}
      </nav>

      <div className={styles.navDivider}></div>

      {/* Filters Section */}
      <div className={styles.filtersSection}>
        <div className={styles.sectionTitle}>Topics</div>
        {filterOptions.map(({ id, icon: Icon, label, filter, disabled }) => {
          const isActive = currentFilter === filter;

          return (
            <motion.button
              key={id}
              type="button"
              className={`${styles.filterItem} ${isActive ? styles.active : ''}`}
              onClick={() => !disabled && handleFilterClick(filter)}
              disabled={disabled}
              whileHover={{ scale: disabled ? 1 : 1.02 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              aria-label={label}
            >
              <Icon className={styles.filterIcon} />
              <span className={styles.filterLabel}>{label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Create Button at Bottom */}
      <div className={styles.createButtonContainer}>
        <motion.button
          className={styles.createButton}
          onClick={handleCreatePost}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Create post"
        >
          <FaPlus />
          <span>Create Post</span>
        </motion.button>
      </div>

      {/* Theme Switcher */}
      <div className={styles.themeSwitcherContainer}>
        <button
          className={styles.themeSwitcher}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
