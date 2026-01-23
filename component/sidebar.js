'use client';

import styles from '../styles/Sidebar.module.css';
import { usePathname, useRouter } from 'next/navigation';
import {
  FaBell,
  FaBookmark,
  FaChartLine,
  FaCog,
  FaFire,
  FaHashtag,
  FaHome,
  FaPlus,
  FaUserAlt,
} from 'react-icons/fa';
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
    { id: 'settings', icon: FaCog, label: 'Settings', path: '/settings' },
  ];

  const categoryHeaders = [
    { title: 'Menu', items: navItems },
  ];

  const filterOptions = [
    { id: 'recent', icon: FaFire, label: 'Recent', filter: 'recent' },
    { id: 'trending', icon: FaChartLine, label: 'Trending', filter: 'trending', disabled: true },
    { id: 'technology', icon: FaCog, label: 'Technology', filter: 'topic:Technology' },
    { id: 'sports', icon: FaFire, label: 'Sports', filter: 'topic:Sports' },
    { id: 'entertainment', icon: FaChartLine, label: 'Entertainment', filter: 'topic:Entertainment' },
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
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          <FaFire className={styles.logoIcon} />
          <span>hero</span>
        </div>
      </div>

      <div className={styles.sideScrollArea}>
        {categoryHeaders.map((category, idx) => (
          <div key={idx} className={styles.navSection}>
            <div className={styles.sectionTitle}>{category.title}</div>
            <nav className={styles.sidebarNav}>
              {category.items.map(({ id, icon: Icon, label, path, badge, disabled }) => {
                const isActive = path && pathname === path;

                return (
                  <button
                    key={id}
                    type="button"
                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    onClick={() => {
                      if (path && !disabled) {
                        handleNavClick(path);
                      }
                    }}
                    disabled={disabled}
                    aria-label={label}
                    aria-current={isActive ? 'page' : undefined}
                    aria-disabled={disabled ? 'true' : undefined}
                  >
                    <Icon className={styles.navIcon} />
                    <span className={styles.navLabel}>{label}</span>
                    {badge && <div className={styles.notificationDot} />}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}

        <div className={styles.navSection}>
          <div className={styles.sectionTitle}>Topics</div>
          <div className={styles.filtersSection}>
            {filterOptions.map(({ id, icon: Icon, label, filter, disabled }) => {
              const isActive = currentFilter === filter;

              return (
                <button
                  key={id}
                  type="button"
                  className={`${styles.filterItem} ${isActive ? styles.active : ''}`}
                  onClick={() => !disabled && handleFilterClick(filter)}
                  disabled={disabled}
                  aria-label={label}
                >
                  <Icon className={styles.filterIcon} />
                  <span className={styles.filterLabel}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.createButtonContainer}>
          <button
            className={styles.createButton}
            onClick={handleCreatePost}
            aria-label="Create post"
            type="button"
          >
            <FaPlus />
            <span>Create Post</span>
          </button>
        </div>
      </div>


      <div className={styles.sidebarFooter}>
        <div className={styles.footerActions}>
          <button
            className={styles.themeSwitcher}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            type="button"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </aside>
  );

};

export default Sidebar;
