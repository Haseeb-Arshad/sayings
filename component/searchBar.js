// components/SearchBar.js

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from '../utils/axiosInstance';
import { FaSearch } from 'react-icons/fa';
import styles from './../styles/SearchBar.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import debounce from 'lodash.debounce';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const dropdownRef = useRef(null);
  const router = useRouter();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchTerm) => {
      if (!searchTerm.trim()) {
        setResults([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get('/search', {
          params: { q: searchTerm },
        });
        setResults(response.data.results);
      } catch (err) {
        console.error('Error searching:', err);
        setError('Failed to fetch results. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (query) {
      debouncedSearch(query);
      setIsDropdownOpen(true);
    } else {
      setResults([]);
      setIsDropdownOpen(false);
      setError(null);
    }
  }, [query, debouncedSearch]);

  // Close dropdown when clicking outside
  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle navigation on result click
  const handleResultClick = (result) => {
    setIsDropdownOpen(false);
    setQuery('');

    if (result.type === 'user') {
      router.push(`/profile/${result.username}`);
    } else if (result.type === 'post') {
      router.push(`/post/${result.id}`);
    } else if (result.type === 'topic') {
      router.push(`/topic/${result.topic}`);
    }
  };

  return (
    <div className={styles.searchContainer} ref={dropdownRef}>
      <form onSubmit={(e) => e.preventDefault()} className={styles.searchForm}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className={styles.searchButton}
          type="button"
          aria-label="Search"
          onClick={() => {
            if (query.trim()) {
              debouncedSearch(query);
            }
          }}
        >
          <FaSearch />
        </motion.button>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search VoiceSocial..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim()) {
              setIsDropdownOpen(true);
            }
          }}
        />
      </form>
      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            className={styles.dropdown}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <p className={styles.loadingText}>Searching...</p>
            ) : error ? (
              <p className={styles.errorText}>{error}</p>
            ) : results.length > 0 ? (
              results.map((result) => (
                <div
                  key={result.id || result.topic}
                  className={styles.resultItem}
                  onClick={() => handleResultClick(result)}
                >
                  {result.type === 'user' ? (
                    <div className={styles.userResult}>
                      <img
                        src={result.avatar || '/placeholder-avatar.png'}
                        alt={`${result.username}'s avatar`}
                        className={styles.avatar}
                      />
                      <span>{result.username}</span>
                    </div>
                  ) : result.type === 'post' ? (
                    <div className={styles.postResult}>
                      <span>{result.transcript.slice(0, 50)}...</span>
                    </div>
                  ) : (
                    <div className={styles.topicResult}>
                      <span>#{result.topic}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className={styles.noResults}>No results found.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
