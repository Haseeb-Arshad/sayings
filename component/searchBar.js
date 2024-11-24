// components/SearchBar.js

'use client';

import { useState, useEffect, useRef } from 'react';
import axios from '../utils/axiosInstance';
import { FaSearch } from 'react-icons/fa';
import styles from './../styles/SearchBar.module.css';
import { motion, AnimatePresence } from 'framer-motion';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setIsDropdownOpen(true);
    try {
      const response = await axios.get('/search', {
        params: { q: query },
      });
      setResults(response.data.results);
    } catch (error) {
      console.error('Error searching:', error);
    }
    setLoading(false);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      closeDropdown();
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={styles.searchContainer} ref={dropdownRef}>
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className={styles.searchButton}
          type="submit"
          aria-label="Search"
        >
          <FaSearch />
        </motion.button>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsDropdownOpen(true)}
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
            ) : results.length > 0 ? (
              results.map((result, index) => (
                <div
                  key={index}
                  className={styles.resultItem}
                  onClick={closeDropdown}
                >
                  {result.type === 'user' ? (
                    <p>User: {result.username}</p>
                  ) : result.type === 'post' ? (
                    <p>Post: {result.transcript.slice(0, 50)}...</p>
                  ) : (
                    <p>Topic: {result.topic}</p>
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
