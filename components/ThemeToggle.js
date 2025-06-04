import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';
import styles from '../styles/ThemeToggle.module.css';

const ThemeToggle = () => {
  const { isDarkTheme, toggleTheme } = useTheme();

  return (
    <button 
      className={styles.toggleButton} 
      onClick={toggleTheme}
      aria-label={`Switch to ${isDarkTheme ? 'light' : 'dark'} theme`}
    >
      {isDarkTheme ? (
        <FaSun className={styles.toggleIcon} />
      ) : (
        <FaMoon className={styles.toggleIcon} />
      )}
    </button>
  );
};

export default ThemeToggle;
