'use client';

import styles from '../styles/Sidebar.module.css';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaHome, FaBell, FaUserAlt, FaPlus, FaComment, FaEllipsisH, FaStar, FaBookmark, FaSearch, FaCog, FaMapMarkerAlt } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const Sidebar = () => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
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
        <div className={styles.navItem} onClick={() => handleNavClick('/')}>
          <FaHome size={20} />
          <span className={styles.navTooltip}>Home</span>
        </div>
        
        <div className={styles.navItem}>
          <FaSearch size={18} />
          <span className={styles.navTooltip}>Search</span>
        </div>
        
        <div className={styles.navItem}>
          <FaBell size={18} />
          <div className={styles.notificationDot}></div>
          <span className={styles.navTooltip}>Notifications</span>
        </div>
        
        <div className={styles.navItem}>
          <FaBookmark size={18} />
          <span className={styles.navTooltip}>Bookmarks</span>
        </div>
        
        <div className={styles.navItem}>
          <FaStar size={18} />
          <span className={styles.navTooltip}>Favorites</span>
        </div>
        
        <div className={styles.navItem}>
          <FaUserAlt size={18} />
          <span className={styles.navTooltip}>Profile</span>
        </div>
        
        <div className={styles.navItem}>
          <FaCog size={18} />
          <span className={styles.navTooltip}>Settings</span>
        </div>
        
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
        <div className={styles.bioText}>design that feels alive.</div>
        <div className={styles.bioDetails}>
          cat parent & dad of 2! 🐱❤️ i regularly abuse & neglect my children.
        </div>
        <div className={styles.prideText}>OUT & PROUD! 🌈</div>
        
        {/* Additional Info */}
        <div className={styles.additionalInfo}>
          <div>m/he hobny brown STAN!</div>
          <div>46 elder millenia! 🌟</div>
        </div>
        
        {/* Song Reference */}
        <div className={styles.songReference}>
          <div className={styles.songTitle}>
            <span className={styles.songName}>I Love You Jesus</span>
            <span className={styles.artistName}> — Trisha Patyas</span>
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
