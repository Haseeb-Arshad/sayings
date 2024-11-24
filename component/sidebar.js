// components/Sidebar.js

'use client';

import { useEffect, useState } from 'react';
import axios from '../utils/axiosInstance';
import styles from './../styles/Sidebar.module.css';
import { motion } from 'framer-motion';

const Sidebar = ({ setFilter }) => {
  const [topTopics, setTopTopics] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopTopics = async () => {
      try {
        const response = await axios.get('/topics/top');
        setTopTopics(response.data.topics);
      } catch (err) {
        console.error('Error fetching top topics:', err);
        setError(err.response?.data?.error || 'Failed to fetch top topics.');
      }
      setLoading(false);
    };

    fetchTopTopics();
  }, []);

  const handleTopicClick = (topicName) => {
    setFilter(`topic:${topicName}`);
  };

  return (
    <div className={styles.sidebar}>
      <h3 className={styles.title}>Top Topics</h3>
      {loading && <p className={styles.loadingText}>Loading topics...</p>}
      {error && <p className={styles.error}>{error}</p>}
      <ul className={styles.topicList}>
        {!loading &&
          !error &&
          topTopics.map((topic) => (
            <motion.li
              key={topic._id}
              className={styles.topicItem}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <button
                className={styles.topicButton}
                onClick={() => handleTopicClick(topic.name)}
              >
                <div className={styles.topicContent}>
                  <div className={styles.topicIcon}>
                    {/* You can use an icon or an initial here */}
                    {topic.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.topicInfo}>
                    <span className={styles.topicName}>{topic.name}</span>
                    <span className={styles.topicDescription}>
                      {topic.description || 'Join the conversation'}
                    </span>
                  </div>
                </div>
              </button>
            </motion.li>
          ))}
      </ul>
    </div>
  );
};

export default Sidebar;
