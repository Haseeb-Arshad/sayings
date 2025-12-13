import { useEffect, useState } from 'react';
import styles from '../styles/Notifications.module.css';
import { FaBell } from 'react-icons/fa';
import axios from 'axios';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/notifications`,
          {
            headers: {
              Authorization:
                'Bearer h7F!yN8$wLpX@x9&c2ZvQk3*oT5#aEg4rJ6^pBmN!A',
            },
          }
        );
        setNotifications(response.data.notifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, []);

  return (
    <div className={styles.notificationsContainer}>
      <button
        className={styles.bellButton}
        onClick={() => setIsDropdownOpen((s) => !s)}
        type="button"
      >
        <FaBell size={20} />
        {notifications.length > 0 && (
          <span className={styles.badge}>{notifications.length}</span>
        )}
      </button>

      {isDropdownOpen && (
        <div className={styles.dropdown}>
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
        </div>
      )}
    </div>
  );
};

export default Notifications;
