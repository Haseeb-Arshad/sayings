'use client';

import styles from '../styles/Sidebar.module.css';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaHome, FaBell, FaUserAlt, FaPlus, FaComment, FaEllipsisH, FaStar, FaBookmark, FaSearch, FaCog, FaMapMarkerAlt } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'home', icon: FaHome, label: 'Home', path: '/' },
    { id: 'search', icon: FaSearch, label: 'Search', disabled: true },
    { id: 'notifications', icon: FaBell, label: 'Notifications', badge: true, disabled: true },
    { id: 'bookmarks', icon: FaBookmark, label: 'Bookmarks', disabled: true },
    { id: 'favorites', icon: FaStar, label: 'Favorites', disabled: true },
    { id: 'profile', icon: FaUserAlt, label: 'Profile', path: '/profile' },
    { id: 'settings', icon: FaCog, label: 'Settings', path: '/settings' }
  ];
  
  const handleNavClick = (path) => {
    router.push(path);
  };

  const handleCreatePost = () => {
    router.push('/create');
  };

  return (
    <aside className={styles.sidebar}>
      {/* Left sidebar navigation */}
      <nav className={styles.sidebarNav}>
        {navItems.map(({ id, icon: Icon, label, path, badge, disabled }) => {
          const isActive = path && pathname === path;
          const handleClick = () => {
            if (path) {
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
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={disabled ? 'true' : undefined}
            >
              <Icon size={18} />
              {badge && <div className={styles.notificationDot}></div>}
              <span className={styles.navTooltip}>{label}</span>
            </motion.button>
          );
        })}
        
        <div className={styles.navDivider}></div>
        
        <div className={styles.createButtonContainer}>
          <motion.div 
            className={styles.createButton}
            onClick={handleCreatePost}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaPlus size={16} />
          </motion.div>
          <span className={styles.navTooltip}>Create</span>
        </div>
        
        <div className={styles.themeSwitcher} onClick={toggleTheme}>
          {theme === 'dark' ? '☀️' : '🌙'}
          <span className={styles.navTooltip}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </div>
      </nav>
      
      {/* User profile section */}
      <div className={styles.userProfile}>
        {/* Profile Header Banner */}
        <div className={styles.profileHeaderBanner}>
          <img src="/profile-banner.jpg" alt="Profile Banner" className={styles.bannerImage} />
        </div>
        
        {/* Profile Avatar and Name */}
        <div className={styles.profileContainer}>
          <div className={styles.profileAvatar}>
            <img src="/avatar-placeholder.png" alt="Profile" />
          </div>
          
          <div className={styles.userHeader}>
            <div className={styles.userName}>
              <span className={styles.name}>tom</span>
              <span className={styles.pronouns}>he/him</span>
            </div>
            <div className={styles.userStatus}>Now</div>
          </div>
        </div>
        
        {/* Bio Section */}
        <div className={styles.aboutSection}>About</div>
        <div className={styles.bioText}>Sharing thoughts on sound, design, and simplicity.</div>
        <div className={styles.bioDetails}>Always learning. Building in public.</div>
        
        {/* Song Reference */}
        <div className={styles.songReference}>
          <div className={styles.songTitle}>
            <span className={styles.songName}>Now Playing</span>
            <span className={styles.artistName}> — Unknown Artist</span>
          </div>
          <div className={styles.duration}>-0:24</div>
        </div>
        
        <div className={styles.listenButtonContainer}>
          <button className={styles.listenButton}>
            <FaComment size={14} /> Listen Along
          </button>
        </div>
        
        {/* Location info */}
        <div className={styles.locationInfo}>
          <FaMapMarkerAlt size={14} className={styles.locationIcon} />
          Philadelphia, PA
        </div>
        
        <div className={styles.timeWidget}>
          <div className={styles.time}>10:04 <span>AM</span></div>
          <div className={styles.timeZone}>CET—Today <span className={styles.timeOffset}>+7hrs</span></div>
          <div className={styles.location}>
            <span>Fr, Marseille</span>
          </div>
        </div>
        
        {/* Chat Button */}
        <div className={styles.chatButtonContainer}>
          <button className={styles.chatButton}>
            Chat
            <div className={styles.chatButtonIcon}><FaEllipsisH size={12} /></div>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
