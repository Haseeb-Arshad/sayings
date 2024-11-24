// components/SuggestionsSidebar.js

'use client';

import { useEffect, useState } from 'react';
import axios from '../utils/axiosInstance';
import styles from '../styles/suggestionsBar.module.css';
import { motion } from 'framer-motion';

const SuggestionsSidebar = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await axios.get('/topics/suggestions');
        setSuggestions(response.data.suggestions);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setError(err.response?.data?.error || 'Failed to fetch suggestions.');
      }
      setLoading(false);
    };

    fetchSuggestions();
  }, []);

  return (
    <div className={styles.sidebar}>
      <h3 className={styles.title}>Suggested Topics</h3>
      {loading && <p className={styles.loadingText}>Loading suggestions...</p>}
      {error && <p className={styles.error}>{error}</p>}
      <ul className={styles.suggestionList}>
        {!loading &&
          !error &&
          suggestions.map((suggestion) => (
            <motion.li
              key={suggestion._id}
              className={styles.suggestionItem}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={styles.suggestionContent}>
                <div className={styles.suggestionQuestion}>
                  {suggestion.question}
                </div>
                {suggestion.details && (
                  <div className={styles.suggestionDetails}>
                    {suggestion.details}
                  </div>
                )}
              </div>
            </motion.li>
          ))}
      </ul>
    </div>
  );
};

export default SuggestionsSidebar;
