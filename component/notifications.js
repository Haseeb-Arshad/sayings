// components/Notifications.js

import { useState, useEffect } from 'react';
import styles from '../styles/Notifications.module.css';
import { FaBell } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/notifications`, {
          headers: {
            Authorization: 'Bearer h7F!yN8$wLpX@x9&c2ZvQk3*oT5#aEg4rJ6^pBmN!A'
            // `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setNotifications(response.data.notifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, []);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className={styles.notificationsContainer}>
      <motion.button
        className={styles.bellButton}
        onClick={toggleDropdown}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <FaBell size={20} />
        {notifications.length > 0 && <span className={styles.badge}>{notifications.length}</span>}
      </motion.button>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            className={styles.dropdown}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className={styles.dropdownTitle}>Notifications</h3>
            {notifications.length > 0 ? (
              notifications.map((notif, index) => (
                <div key={index} className={styles.notificationItem}>
                  <p>{notif.message}</p>
                  <span className={styles.notificationTime}>{notif.time}</span>
                </div>
              ))
            ) : (
              <p className={styles.noNotifications}>No notifications.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notifications;
