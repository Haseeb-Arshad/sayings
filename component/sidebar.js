'use client';

import styles from '../styles/Sidebar.module.css';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaHome, FaBell, FaUser, FaPlus, FaComment, FaEllipsisH } from 'react-icons/fa';

const Sidebar = () => {
  const router = useRouter();
  
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
        <div className={styles.avatarContainer}>
          <div className={styles.profileAvatar}>
            <img src="/avatar-placeholder.png" alt="Profile" />
          </div>
        </div>
        
        <div className={styles.navItem} onClick={() => handleNavClick('/')}>
          <FaHome size={24} />
        </div>
        
        <div className={styles.navItem}>
          <FaBell size={22} />
          <div className={styles.notificationDot}></div>
        </div>
        
        <div className={styles.navItem}>
          <FaUser size={22} />
        </div>
        
        <div className={styles.createButtonContainer}>
          <motion.div 
            className={styles.createButton}
            onClick={handleCreatePost}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaPlus />
          </motion.div>
        </div>
      </nav>
      
      {/* User profile section */}
      <div className={styles.userProfile}>
        <div className={styles.userHeader}>
          <div className={styles.userName}>
            <span className={styles.name}>tom</span>
            <span className={styles.pronouns}>he/him</span>
          </div>
          
          <div className={styles.userStatus}>Now</div>
        </div>
        
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
        
        <div className={styles.aboutSection}>About</div>
        
        <div className={styles.bioText}>design that feels alive.</div>
        
        <div className={styles.bioDetails}>
          cat parent & dad of 2! 🐱❤️ i regularly abuse & neglect my children.
        </div>
        
        <div className={styles.prideText}>OUT & PROUD! 🌈</div>
        
        <div className={styles.additionalInfo}>
          <div>m/he hobny brown STAN!</div>
          <div>46 elder millenia! 🌟</div>
        </div>
        
        <div className={styles.locationInfo}>
          <div className={styles.timeWidget}>
            <div className={styles.time}>10:04 <span>AM</span></div>
            <div className={styles.timeZone}>CET—Today <span className={styles.timeOffset}>+7hrs</span></div>
          </div>
          
          <div className={styles.location}>
            <span>Fr, Marseille</span>
          </div>
        </div>
        
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
