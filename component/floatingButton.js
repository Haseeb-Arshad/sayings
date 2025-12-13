'use client';

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import styles from '../styles/FloatingVoiceButton.module.css';
import { useAuth } from '../context/useAuth';
import { useRouter } from 'next/navigation';

const AnimatedAudioRecorder = lazy(() => import('./upload'));

const FloatingVoiceButton = ({ onNewPost }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 100);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleButtonClick = () => {
    if (!navigator.onLine) {
      alert('Not connected to the internet. Please check your connection.');
      return;
    }
    if (loading) return;

    if (user) {
      setIsOpen((s) => !s);
    } else {
      router.push('/login');
    }
  };

  return (
    <>
      <button
        className={styles.floatingButton}
        onClick={handleButtonClick}
        aria-label={user ? 'Open Voice Recorder' : 'Login to use Voice Recorder'}
        style={{
          background: `linear-gradient(135deg, rgba(59,130,246,${0.9 + audioLevel / 1000}), rgba(37,99,235,${0.9 + audioLevel / 1000}))`,
        }}
        type="button"
      >
        <FaMicrophone size={24} />
      </button>

      {isOpen && user && (
        <Suspense fallback={null}>
          <AnimatedAudioRecorder
            onNewPost={(post) => {
              if (onNewPost) onNewPost(post);
            }}
            onClose={() => setIsOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
};

export default FloatingVoiceButton;
