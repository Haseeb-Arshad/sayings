// components/FloatingVoiceButton.js

'use client';
import { useState, useRef, useEffect } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import styles from '../styles/FloatingVoiceButton.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import AudioRecorder from './upload';

const FloatingVoiceButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const modalRef = useRef(null);

  const toggleRecorder = () => {
    setIsOpen(!isOpen);
  };

  const handleClickOutside = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      <motion.button
        className={styles.floatingButton}
        onClick={toggleRecorder}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <FaMicrophone size={24} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modalContent}
              ref={modalRef}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <button className={styles.closeButton} onClick={toggleRecorder}>
                &times;
              </button>
              <AudioRecorder
                onNewPost={(post) => {
                  // Optionally handle new post
                  console.log('New Post from Floating Button:', post);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingVoiceButton;
