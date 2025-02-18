'use client';

import { useEffect, useState } from 'react';
import axios from '../utils/axiosInstance';
import styles from '../styles/Sidebar.module.css';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const Sidebar = ({ setFilter, currentFilter }) => {
  const [topTopics, setTopTopics] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchTopTopics = async () => {
      if (!navigator.onLine) {
        setError("Not connected to the internet. Please check your network.");
        setLoading(false);
        return;
      }
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

    // Optionally, re-fetch when the client comes back online
    const handleOnline = () => {
      setError('');
      setLoading(true);
      fetchTopTopics();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleTopicClick = (topicName) => {
    const newFilter = `topic:${topicName}`;
    setFilter(newFilter);
    router.push(`${pathname}?filter=${encodeURIComponent(newFilter)}`);
  };

  const handleRecentClick = () => {
    const newFilter = 'recent';
    setFilter(newFilter);
    router.push(`${pathname}`);
  };

  const displayedTopics = showMore ? topTopics : topTopics.slice(0, 5);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarContent}>
        <h3 className={styles.title}>Trending Topics</h3>
        <button
          className={`${styles.topicButton} ${
            currentFilter === 'recent' ? styles.active : ''
          }`}
          onClick={handleRecentClick}
        >
          <div className={styles.topicHeader}>
            <span className={styles.topicCategory}>Recent</span>
          </div>
        </button>
        {loading && <p className={styles.loadingText}>Loading topics...</p>}
        {error && <p className={styles.error}>{error}</p>}
        <ul className={styles.topicList}>
          {!loading &&
            !error &&
            displayedTopics.map((topic) => (
              <li key={topic._id} className={styles.topicItem}>
                <button
                  className={`${styles.topicButton} ${
                    currentFilter === `topic:${topic.name}` ? styles.active : ''
                  }`}
                  onClick={() => handleTopicClick(topic.name)}
                >
                  <div className={styles.topicHeader}>
                    <span className={styles.topicCategory}>Trending</span>
                  </div>
                  <div className={styles.topicName}>{topic.name}</div>
                  <div className={styles.postCount}>
                    {topic.postCount} posts
                  </div>
                </button>
              </li>
            ))}
        </ul>
        {topTopics.length > 5 && (
          <button
            className={styles.showMoreButton}
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
