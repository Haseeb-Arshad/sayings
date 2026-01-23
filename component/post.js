'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/Post.module.css';
import {
  FaComment,
  FaEllipsisH,
  FaHeart,
  FaShareAlt,
  FaTimes,
  FaTrash,
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import axios from '../utils/axiosInstance';
import WaveformSkeleton from './audio/WaveformSkeleton';

const WaveformPlayer = React.lazy(() => import('./audio/WaveformPlayer'));

const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

export const expressionColors = {
  happy: '#8a56ff',
  sad: '#FF4D4F',
  angry: '#F59E0B',
  calm: '#56ccf2',
  excited: '#ff6584',
};

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

const Post = React.memo(function Post({
  post,
  currentUserId,
  onDelete,
  enableWaveform = false,
}) {
  const router = useRouter();

  if (!post) return null;

  const [highlightedWordIndex, setHighlightedWordIndex] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const [likes, setLikes] = useState(post.likes || 0);
  const [hasLiked, setHasLiked] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const menuRef = useRef(null);
  const overflowRef = useRef(null);
  const postRef = useRef(null);
  const playerRef = useRef(null);

  const audioSrc = useMemo(() => {
    if (!post.audioPinataURL) return '';
    return post.audioPinataURL.startsWith('http')
      ? post.audioPinataURL
      : `${PINATA_GATEWAY}${post.audioPinataURL}`;
  }, [post.audioPinataURL]);

  const topIABCategories = useMemo(() => {
    if (
      post.iab_categories_result &&
      post.iab_categories_result.summary &&
      Array.isArray(post.iab_categories_result.summary)
    ) {
      return post.iab_categories_result.summary
        .slice()
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
    }
    return [];
  }, [post.iab_categories_result]);

  const topEmotions = useMemo(() => {
    if (post.overallEmotions && post.overallEmotions.length > 0) {
      const sorted = [...post.overallEmotions].sort((a, b) => b.score - a.score);
      const displayed = sorted.slice(0, 2);
      const remaining = sorted.length - 2;
      return { displayed, remaining, overflow: sorted.slice(2) };
    }
    return { displayed: [], remaining: 0, overflow: [] };
  }, [post.overallEmotions]);

  const avatarUrl = post.user?.avatar || '/images/profile/dp.webp';
  const username = post.user?.username || 'Anonymous';
  const timestamp = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(post.timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  }, [post.timestamp]);

  const isOwner = currentUserId && post.user && post.user._id === currentUserId;

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overflowRef.current && !overflowRef.current.contains(event.target)) {
        setIsTooltipVisible(false);
      }
    };

    if (isTooltipVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTooltipVisible]);

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

  const handleDelete = async () => {
    setIsModalOpen(false);
    setIsDeleting(true);

    try {
      await axios.delete(`/posts/${post._id}`);
      // Allow a small CSS transition window before unmounting (if parent removes item)
      setTimeout(() => {
        if (onDelete) onDelete(post._id);
      }, 180);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert(error.response?.data?.error || 'An error occurred while deleting the post.');
      setIsDeleting(false);
    }
  };

  const toggleTranscript = () => {
    setShowTranscript((s) => !s);
    setHighlightedWordIndex(null);
  };

  const handleWordClick = (index) => {
    if (!enableWaveform) return;

    const word = post.words?.[index];
    if (!word || word.start === undefined) return;

    const seekTime = word.start / 1000;
    playerRef.current?.seekToSeconds?.(seekTime);
  };

  const renderOverflowTooltip = () => {
    if (topEmotions.remaining <= 0) return null;

    return (
      <div className={styles.tooltipContent}>
        {topEmotions.overflow.map((emotion, index) => {
          const emotionKey = emotion.name.toLowerCase();
          const bgColor = expressionColors[emotionKey] || '#e0e0e0';
          const textColor = getContrastingTextColor(bgColor);
          const emotionName =
            emotion.name.charAt(0).toUpperCase() + emotion.name.slice(1);

          return (
            <span
              key={index}
              className={styles.emotionBadge}
              style={{ backgroundColor: bgColor, color: textColor }}
            >
              {emotionName}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`${styles.post} ${isDeleting ? styles.postDeleting : ''} fadeIn`}
      ref={postRef}
    >
      <div className={styles.postHeader}>
        <div className={styles.userInfo}>
          <img src={avatarUrl} alt={username} className={styles.avatar} />
          <div>
            <div className={styles.username}>{username}</div>
            <div className={styles.timestamp}>{timestamp}</div>
          </div>
        </div>

        {isOwner && (
          <div className={styles.menuContainer} ref={menuRef}>
            <button
              className={styles.menuButton}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="More options"
              type="button"
            >
              <FaEllipsisH />
            </button>
            {isMenuOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  className={styles.dropdownItem}
                  onClick={() => {
                    setIsModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  type="button"
                >
                  <FaTrash className={styles.dropdownIcon} />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.contentArea}>
        <div className={styles.summary}>{post.summary}</div>
      </div>

      <div className={styles.categories}>
        {topIABCategories.map((categoryObj, index) => (
          <span key={index} className={styles.categoryBadge}>
            {categoryObj.category.split('>').pop()}
          </span>
        ))}
      </div>

      <div className={styles.audioPlayer}>
        {audioSrc && (
          <audio
            className={styles.audioNative}
            controls
            preload="none"
            src={audioSrc}
          />
        )}
      </div>

      <div className={styles.postFooter}>
        <div className={styles.reactions}>
          <button
            type="button"
            className={`${styles.iconButton} ${hasLiked ? styles.likedButton : ''}`}
            onClick={handleLike}
          >
            <FaHeart />
            <span>{likes}</span>
          </button>

          <button
            type="button"
            className={styles.iconButton}
            onClick={() => router.push(`/post/${post._id}`)}
          >
            <FaComment />
            <span>{post.comments ? post.comments.length : 0}</span>
          </button>
        </div>

        <button
          type="button"
          className={styles.openPostButton}
          onClick={() => router.push(`/post/${post._id}`)}
        >
          View Details
        </button>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Delete Post?</h3>
            <p>This action cannot be undone.</p>
            <div className={styles.modalFooter}>
              <button onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className={styles.confirmButton} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

});

export default Post;
