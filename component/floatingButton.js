// components/FloatingVoiceButton.jsx

'use client';

import React, { useState, useEffect } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import styles from '../styles/FloatingVoiceButton.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedAudioRecorder from './upload'; // Ensure correct import path
import { useAuth } from '../context/useAuth'; // Adjust the path as necessary
import { useRouter } from 'next/navigation'; // Import useRouter for navigation

const FloatingVoiceButton = ({ onNewPost }) => { // Accept onNewPost as a prop
  const [isOpen, setIsOpen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const { user, loading } = useAuth(); // Access user and loading state from AuthContext
  const router = useRouter(); // Initialize router for navigation

  useEffect(() => {
    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 100);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleButtonClick = () => {
    if (loading) return; // Optionally, handle loading state (e.g., show a spinner)
    if (user) {
      setIsOpen(!isOpen); // Toggle the audio recorder if authenticated
    } else {
      router.push('/login'); // Redirect to login if not authenticated
    }
  };

  return (
    <AnimatePresence>
      <motion.button
        className={styles.floatingButton}
        onClick={handleButtonClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          background: `linear-gradient(135deg, 
            rgba(59,130,246,${0.9 + audioLevel / 1000}), 
            rgba(37,99,235,${0.9 + audioLevel / 1000}))`,
        }}
        transition={{ duration: 0.3 }}
        aria-label={user ? "Open Voice Recorder" : "Login to use Voice Recorder"} // Improve accessibility
      >
        <FaMicrophone size={24} />
      </motion.button>

      {isOpen && user && ( // Ensure the recorder only opens if user is authenticated
        <AnimatedAudioRecorder
          onNewPost={(post) => {
            console.log('New Post:', post);
            if (onNewPost) onNewPost(post); // Invoke the onNewPost callback
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </AnimatePresence>
  );
};

export default FloatingVoiceButton;
