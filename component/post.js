'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import styles from '../styles/Post.module.css';
import {
  FaPlay,
  FaPause,
  FaHeart,
  FaComment,
  FaShareAlt,
  FaEllipsisH,
  FaTrash,
  FaTimes,
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../utils/axiosInstance';

// Emotion color palette
export const expressionColors = {
  happy: '#1DA1F2',
  sad: '#FF4D4F',
  angry: '#F59E0B',
  // Extend as needed
};

// Helper to calculate contrasting text color
const getContrastingTextColor = (backgroundColor) => {
  const color =
    backgroundColor.charAt(0) === '#'
      ? backgroundColor.substring(1, 7)
      : backgroundColor;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 125 ? '#000000' : '#FFFFFF';
};

const Post = React.memo(({ post, currentUserId, onDelete }) => {
  if (!post) return null;

  // Component state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(null);
  const [likes, setLikes] = useState(post.likes || 0);
  const [hasLiked, setHasLiked] = useState(
    post.likedByUsers?.includes(currentUserId)
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  const postRef = useRef(null);
  const waveformContainer = useRef(null);
  const wavesurfer = useRef(null);

  // Lazy load audio functionality when the post scrolls into view.
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setHasIntersected(true);
          observer.disconnect();
        }
      });
    });
    if (postRef.current) observer.observe(postRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize WaveSurfer on demand
  const initializeWaveSurfer = useCallback(async () => {
    if (!hasIntersected || wavesurfer.current || !waveformContainer.current)
      return;

    // Dynamically import WaveSurfer (lazy loading)
    const WaveSurferLib = (await import('wavesurfer.js')).default;

    wavesurfer.current = WaveSurferLib.create({
      container: waveformContainer.current,
      waveColor: '#E0E0E0',
      progressColor: '#1DA1F2',
      cursorColor: 'transparent',
      barWidth: 2,
      barRadius: 2,
      height: 50,
      responsive: true,
      backend: 'WebAudio',
    });

    const audioSrc = post.audioPinataURL.startsWith('http')
      ? post.audioPinataURL
      : `https://gateway.pinata.cloud/ipfs/${post.audioPinataURL}`;

    wavesurfer.current.on('ready', () => {
      setDuration(wavesurfer.current.getDuration());
      setIsReady(true);
    });

    wavesurfer.current.on('audioprocess', () => {
      const time = wavesurfer.current.getCurrentTime();
      setCurrentTime(time);
      if (post.words && post.words.length > 0) {
        const index = post.words.findIndex(
          (word) =>
            time >= word.start / 1000 && time <= word.end / 1000
        );
        setHighlightedWordIndex(index);
      }
    });

    wavesurfer.current.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      wavesurfer.current.seekTo(0);
      setHighlightedWordIndex(null);
    });

    wavesurfer.current.load(audioSrc);
  }, [hasIntersected, post.audioPinataURL, post.words]);

  // Toggle play/pause
  const togglePlay = async () => {
    if (!wavesurfer.current) {
      await initializeWaveSurfer();
      return;
    }
    if (!isReady) return;

    if (isPlaying) {
      wavesurfer.current.pause();
      setIsPlaying(false);
    } else {
      wavesurfer.current.play();
      setIsPlaying(true);
    }
  };

  // Toggle transcript visibility
  const toggleTranscript = () => {
    setShowTranscript((prev) => !prev);
  };

  // Format time as mm:ss
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // Handle like action (optimistic update)
  const handleLike = async () => {
    if (hasLiked) {
      alert('You have already liked this post.');
      return;
    }
    setLikes((prev) => prev + 1);
    setHasLiked(true);
    try {
      const response = await axios.put(`/posts/${post._id}/like`);
      if (response.data.post.likes !== likes + 1) {
        setLikes(response.data.post.likes);
      }
    } catch (err) {
      setLikes((prev) => prev - 1);
      setHasLiked(false);
      alert('Failed to like post.');
    }
  };

  // Handle deletion
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`/posts/${post._id}`);
      onDelete(post._id);
    } catch (err) {
      alert('Failed to delete post.');
      setIsDeleting(false);
    }
  };

  // Basic user info
  const avatarUrl = post.user?.avatar || '/images/profile/dp.webp';
  const username = post.user?.username || 'Anonymous';
  const timestamp = formatDistanceToNow(new Date(post.timestamp), {
    addSuffix: true,
  });

  // Compute top emotions
  const topEmotions = useMemo(() => {
    if (post.overallEmotions && post.overallEmotions.length > 0) {
      const sorted = [...post.overallEmotions].sort(
        (a, b) => b.score - a.score
      );
      const displayed = sorted.slice(0, 2);
      const remaining = sorted.length - 2;
      return { displayed, remaining };
    }
    return { displayed: [], remaining: 0 };
  }, [post.overallEmotions]);

  // Clean up WaveSurfer instance on unmount
  useEffect(() => {
    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, []);

  return (
    <motion.div
      className={styles.postContainer}
      ref={postRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <img
            src={avatarUrl}
            alt={`${username} avatar`}
            className={styles.avatar}
          />
          <div className={styles.userDetails}>
            <span className={styles.username}>{username}</span>
            <span className={styles.timestamp}>{timestamp}</span>
          </div>
        </div>
        <div className={styles.actions}>
          {topEmotions.displayed.map((emotion, idx) => {
            const bgColor =
              expressionColors[emotion.name.toLowerCase()] || '#e0e0e0';
            const textColor = getContrastingTextColor(bgColor);
            return (
              <span
                key={idx}
                className={styles.emotionBadge}
                style={{ backgroundColor: bgColor, color: textColor }}
              >
                {emotion.name}
              </span>
            );
          })}
          {post.user && currentUserId && post.user._id === currentUserId && (
            <button
              className={styles.menuButton}
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              <FaEllipsisH />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className={styles.dropdownMenu}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <button
              className={styles.dropdownItem}
              onClick={() => {
                setIsModalOpen(true);
                setIsMenuOpen(false);
              }}
            >
              <FaTrash /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className={styles.content}>
        <p className={styles.summary}>{post.summary}</p>
        <AnimatePresence>
          {showTranscript && (
            <motion.div
              className={styles.transcript}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {post.words && post.words.length > 0 ? (
                post.words.map((word, idx) => (
                  <span
                    key={idx}
                    className={`${styles.word} ${
                      highlightedWordIndex === idx ? styles.highlighted : ''
                    }`}
                  >
                    {word.text}{' '}
                  </span>
                ))
              ) : (
                <p>{post.transcript}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <button className={styles.toggleTranscript} onClick={toggleTranscript}>
          {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
        </button>
      </div>

      {/* Audio Player */}
      <div className={styles.audioPlayer}>
        <button className={styles.playButton} onClick={togglePlay}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <div
          className={styles.waveformContainer}
          ref={waveformContainer}
        />
        <span className={styles.time}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Interaction Buttons */}
      <div className={styles.interactions}>
        <button className={styles.interaction} onClick={handleLike}>
          <FaHeart color={hasLiked ? 'red' : 'inherit'} /> {likes}
        </button>
        <button className={styles.interaction}>
          <FaComment /> {post.comments || 0}
        </button>
        <button className={styles.interaction}>
          <FaShareAlt /> Share
        </button>
      </div>

      {/* Deletion Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              className={styles.modal}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.modalHeader}>
                <h3>Confirm Deletion</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={styles.closeModal}
                >
                  <FaTimes />
                </button>
              </div>
              <div className={styles.modalBody}>
                <p>Are you sure you want to delete this post?</p>
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.confirmButton}
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default Post;
