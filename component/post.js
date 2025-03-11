'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import WaveSurfer from 'wavesurfer.js';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../utils/axiosInstance';
import { RefreshContext } from '../context/RefreshContext';

// Define expression colors with a blue-centric palette
export const expressionColors = {
  happy: '#1DA1F2',
  sad: '#FF4D4F',
  angry: '#F59E0B',
  // Add more emotions as needed
};

// Helper function to determine contrasting text color
const getContrastingTextColor = (backgroundColor) => {
  // Remove '#' if present
  const color = backgroundColor.charAt(0) === '#' ? backgroundColor.substring(1, 7) : backgroundColor;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  // Calculate brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 125 ? '#000000' : '#FFFFFF';
};

const Post = React.memo(({ post, currentUserId, onDelete }) => {
  if (!post) return null;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [wavesurferInitialized, setWavesurferInitialized] = useState(false);

  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const playbackLock = useRef(false);

  const [likes, setLikes] = useState(post.likes || 0);
  const [hasLiked, setHasLiked] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false); // State for menu
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal
  const [isDeleting, setIsDeleting] = useState(false); // State for deletion animation

  // Refs for detecting clicks outside
  const menuRef = useRef(null);
  const overflowRef = useRef(null);
  const postRef = useRef(null);

  const [isTooltipVisible, setIsTooltipVisible] = useState(false); // State for tooltip

  const topIABCategories = useMemo(() => {
    if (
      post.iab_categories_result &&
      post.iab_categories_result.summary &&
      Array.isArray(post.iab_categories_result.summary)
    ) {
      const categoriesArray = post.iab_categories_result.summary;
      return categoriesArray
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
    }
    return [];
  }, [post.iab_categories_result]);

  const initializeWaveSurfer = useCallback(async () => {
    if (wavesurferInitialized || !waveformRef.current) return;

    try {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#E0E0E0',
        progressColor: '#1DA1F2',
        cursorColor: 'transparent',
        barWidth: 2,
        barRadius: 2,
        height: 50,
        responsive: true,
        backend: 'WebAudio',
      });

      const pinataGateway = 'https://gateway.pinata.cloud/ipfs/';
      const audioSrc = post.audioPinataURL.startsWith('http')
        ? post.audioPinataURL
        : `${pinataGateway}${post.audioPinataURL}`;

      wavesurfer.current.on('ready', () => {
        setDuration(wavesurfer.current.getDuration());
        setIsReady(true);
        wavesurfer.current.play();
        setIsPlaying(true);
      });

      wavesurfer.current.on('audioprocess', () => {
        const currentTime = wavesurfer.current.getCurrentTime();
        setCurrentTime(currentTime);
        updateHighlightedWord(currentTime);
      });

      wavesurfer.current.on('finish', () => {
        setIsPlaying(false);
        setCurrentTime(0);
        playbackLock.current = false;
        wavesurfer.current.seekTo(0);
        setHighlightedWordIndex(null);
      });

      await wavesurfer.current.load(audioSrc);
      setWavesurferInitialized(true);
    } catch (err) {
      console.error('WaveSurfer initialization error:', err);
    }
  }, [post.audioPinataURL, wavesurferInitialized]);

  const togglePlay = async () => {
    if (playbackLock.current) return;

    try {
      playbackLock.current = true;

      if (!wavesurferInitialized) {
        await initializeWaveSurfer();
      } else {
        if (isPlaying) {
          await wavesurfer.current.pause();
          setIsPlaying(false);
        } else {
          await wavesurfer.current.play();
          setIsPlaying(true);
        }
      }

      setShowTranscript(true);
    } catch (err) {
      console.error('Playback error:', err);
    } finally {
      playbackLock.current = false;
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true); // Start fade-out animation
    try {
      await axios.delete(`/posts/${post._id}`);
      onDelete(post._id); // Inform parent to remove the post
    } catch (error) {
      console.error('Error deleting post:', error);
      alert(
        error.response?.data?.error || 'An error occurred while deleting the post.'
      );
      setIsDeleting(false); // Revert deletion animation if failed
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, []);

  const toggleTranscript = () => {
    setShowTranscript(!showTranscript);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const updateHighlightedWord = (currentTime) => {
    if (!post.words || post.words.length === 0) return;

    const wordIndex = post.words.findIndex(
      (word) =>
        currentTime >= word.start / 1000 && currentTime <= word.end / 1000
    );

    if (wordIndex !== -1 && wordIndex !== highlightedWordIndex) {
      setHighlightedWordIndex(wordIndex);
    }
  };

  const handleWordClick = (index) => {
    if (!wavesurfer.current || !isReady) return;

    const word = post.words[index];
    if (word && word.start !== undefined) {
      const seekTime = word.start / 1000;
      wavesurfer.current.seekTo(seekTime / duration);
      setCurrentTime(seekTime);
      updateHighlightedWord(seekTime);
    }
  };

  const avatarUrl = post.user?.avatar || '/images/profile/dp.webp';
  const username = post.user?.username || 'Anonymous';
  const timestamp = formatDistanceToNow(new Date(post.timestamp), {
    addSuffix: true,
  });

  // Check if the user has already liked the post
  useEffect(() => {
    const checkIfLiked = async () => {
      try {
        const response = await axios.get(`/posts/${post._id}`);
        const currentPost = response.data.post;
        const userId = response.data.userId || null;
        const userIP = response.data.userIP || null;

        if (userId) {
          setHasLiked(currentPost.likedByUsers.includes(userId));
        } else if (userIP) {
          setHasLiked(currentPost.likedByIPs.includes(userIP));
        }
      } catch (err) {
        console.error('Error checking like status:', err);
      }
    };

    checkIfLiked();
  }, [post._id]);

  const handleLike = async () => {
    if (hasLiked) {
      alert('You have already liked this post.');
      return;
    }

    try {
      const response = await axios.put(`/posts/${post._id}/like`);
      setLikes(response.data.post.likes);
      setHasLiked(true);
    } catch (err) {
      console.error('Error liking the post:', err);
      alert('Failed to like the post.');
    }
  };

  const isOwner = currentUserId && post.user && post.user._id === currentUserId;

  // Compute Top Emotions with Overflow Handling
  const topEmotions = useMemo(() => {
    if (post.overallEmotions && post.overallEmotions.length > 0) {
      // Sort emotions by score descending
      const sorted = [...post.overallEmotions].sort((a, b) => b.score - a.score);
      // Slice top 2
      const displayed = sorted.slice(0, 2);
      const remaining = sorted.length - 2;
      return { displayed, remaining };
    }
    return { displayed: [], remaining: 0 };
  }, [post.overallEmotions]);

  // Tooltip for overflow emotions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overflowRef.current && !overflowRef.current.contains(event.target)) {
        setIsTooltipVisible(false);
      }
    };

    if (isTooltipVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTooltipVisible]);

  // Render Overflow Tooltip
  const renderOverflowTooltip = () => {
    if (topEmotions.remaining <= 0) return null;

    const overflowEmotions = post.overallEmotions
      .sort((a, b) => b.score - a.score)
      .slice(2); // Adjusted slice to match topEmotions

    return (
      <div className={styles.tooltip}>
        {overflowEmotions.map((emotion, index) => {
          const emotionKey = emotion.name.toLowerCase();
          const bgColor = expressionColors[emotionKey] || '#e0e0e0';
          const textColor = getContrastingTextColor(bgColor);
          const emotionName = emotion.name.charAt(0).toUpperCase() + emotion.name.slice(1);
          
          return (
            <span
              key={index}
              className={styles.emotionBadge}
              style={{
                backgroundColor: bgColor,
                color: textColor,
              }}
            >
              {emotionName}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {!isDeleting && (
          <motion.div
            className={styles.postContainer}
            whileHover={{ boxShadow: '0px 5px 15px rgba(0,0,0,0.1)' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            layout
            ref={postRef}
          >
            {/* Post Header */}
            <div className={styles.postHeader}>
              {/* Left Side: Avatar and Post Info */}
              <div className={styles.leftHeader}>
                <img
                  src={avatarUrl}
                  alt={`${username}'s avatar`}
                  className={styles.avatar}
                />
                <div className={styles.postInfo}>
                  <span className={styles.username}>{username}</span>
                  <span className={styles.timestamp}>{timestamp}</span>
                </div>
              </div>

              {/* Right Side: Emotions and Menu */}
              <div className={styles.rightHeader}>
                {/* Emotions Section */}
                {topEmotions.displayed.length > 0 && (
                  <div className={styles.emotions}>
                    {topEmotions.displayed.map((emotion, index) => {
                      const emotionKey = emotion.name.toLowerCase();
                      const bgColor = '#e0e0e0';
                      const textColor = '#000';
                      const emotionName =
                        emotion.name.charAt(0).toUpperCase() + emotion.name.slice(1);
                      return (
                        <span
                          key={index}
                          className={styles.emotionBadge}
                          style={{
                            backgroundColor: bgColor,
                            color: textColor,
                          }}
                        >
                          {emotionName}
                        </span>
                      );
                    })}

                    {/* Overflow Badge */}
                    {topEmotions.remaining > 0 && (
                      <div
                        className={styles.overflowBadge}
                        onClick={() => setIsTooltipVisible((prev) => !prev)}
                        ref={overflowRef}
                      >
                        +{topEmotions.remaining}
                        <AnimatePresence>
                          {isTooltipVisible && (
                            <motion.div
                              className={styles.tooltip}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                            >
                              {renderOverflowTooltip()}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                )}

                {/* Menu Button */}
                {isOwner && (
                  <div className={styles.menuContainer} ref={menuRef}>
                    <button
                      className={styles.menuButton}
                      onClick={() => setIsMenuOpen((prev) => !prev)}
                      aria-label="More options"
                    >
                      <FaEllipsisH />
                    </button>
                    <AnimatePresence>
                      {isMenuOpen && (
                        <motion.div
                          className={styles.dropdownMenu}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              setIsModalOpen(true);
                              setIsMenuOpen(false);
                            }}
                          >
                            <FaTrash className={styles.dropdownIcon} />
                            Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className={styles.contentArea}>
              <AnimatePresence mode="wait">
                {!showTranscript && (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    animate={{ opacity: showTranscript ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={styles.summary}>{post.summary}</div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {showTranscript && (
                  <motion.div
                    key="transcript"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={styles.transcript}>
                      {post.words && post.words.length > 0 ? (
                        post.words.map((word, index) => {
                          const isHighlighted = index === highlightedWordIndex;
                          return (
                            <span
                              key={index}
                              className={`${styles.word} ${isHighlighted ? styles.highlighted : ''}`}
                              onClick={() => handleWordClick(index)}
                            >
                              {word.text}{' '}
                            </span>
                          );
                        })
                      ) : (
                        <p>{post.transcript}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Categories */}
            <div className={styles.categories}>
              {topIABCategories.map((categoryObj, index) => (
                <span key={index} className={styles.categoryBadge}>
                  {categoryObj.category.split('>').pop()}
                </span>
              ))}
            </div>

            {/* Audio Player */}
            <div className={styles.audioPlayer}>
              <button
                className={styles.playButton}
                onClick={togglePlay}
                disabled={playbackLock.current}
              >
                {isPlaying ? <FaPause /> : <FaPlay />}
              </button>
              <div className={styles.waveform} ref={waveformRef}></div>
              <div className={styles.time}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Toggle Transcript Button */}
            {isPlaying && (
              <div className={styles.toggleTranscript}>
                <button onClick={toggleTranscript}>
                  {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
                </button>
              </div>
            )}

            {/* Interactions */}
            <div className={styles.interactions}>
              <div className={styles.interactionButton} onClick={handleLike}>
                <FaHeart color={hasLiked ? 'red' : 'inherit'} /> {likes}
              </div>
              <div className={styles.interactionButton}>
                <FaComment /> {post.comments || 0}
              </div>
              <div className={styles.interactionButton}>
                <FaShareAlt /> Share
              </div>
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
              {isModalOpen && (
                <>
                  {/* Overlay */}
                  <motion.div
                    className={styles.modalOverlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => setIsModalOpen(false)}
                  ></motion.div>

                  {/* Modal Content */}
                  <div className={styles.modalContentBack}>
                    <motion.div
                      className={styles.modalContent}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <div className={styles.modalHeader}>
                        <h2>Confirm Deletion</h2>
                        <button
                          className={styles.closeButton}
                          onClick={() => setIsModalOpen(false)}
                          aria-label="Close"
                        >
                          <FaTimes />
                        </button>
                      </div>
                      <div className={styles.modalBody}>
                        <p>Are you sure you want to delete this post?</p>
                      </div>
                      <div className={styles.modalFooter}>
                        <motion.button
                          className={styles.cancelButton}
                          onClick={() => setIsModalOpen(false)}
                          whileHover={{ scale: 1.05, backgroundColor: '#e0e0e0' }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          className={styles.confirmButton}
                          onClick={handleDelete}
                          whileHover={{ scale: 1.05, backgroundColor: '#ff7875' }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Delete
                        </motion.button>
                      </div>
                    </motion.div>
                  </div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default Post;
