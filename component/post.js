// components/Post.js

import { useState, useRef, useEffect, useMemo } from 'react';
import styles from '../styles/Post.module.css';
import {
  FaPlay,
  FaPause,
  FaHeart,
  FaComment,
  FaShareAlt,
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import WaveSurfer from 'wavesurfer.js';
import { motion, AnimatePresence } from 'framer-motion';

const Post = ({ post }) => {
  if (!post) return null;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const playbackLock = useRef(false);

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

  useEffect(() => {
    let isSubscribed = true;

    const initializeWaveSurfer = async () => {
      if (!waveformRef.current) return;

      try {
        if (wavesurfer.current) {
          wavesurfer.current.destroy();
        }

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
          if (isSubscribed) {
            setDuration(wavesurfer.current.getDuration());
            setIsReady(true);
          }
        });

        wavesurfer.current.on('audioprocess', () => {
          if (isSubscribed) {
            const currentTime = wavesurfer.current.getCurrentTime();
            setCurrentTime(currentTime);
            updateHighlightedWord(currentTime);
          }
        });

        wavesurfer.current.on('finish', () => {
          if (isSubscribed) {
            setIsPlaying(false);
            setCurrentTime(0);
            playbackLock.current = false;
            wavesurfer.current.seekTo(0);
            setHighlightedWordIndex(null);
          }
        });

        await wavesurfer.current.load(audioSrc);
      } catch (err) {
        console.error('WaveSurfer initialization error:', err);
      }
    };

    initializeWaveSurfer();

    return () => {
      isSubscribed = false;
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [post.audioPinataURL]);

  const togglePlay = async () => {
    if (playbackLock.current || !wavesurfer.current || !isReady) return;

    try {
      playbackLock.current = true;

      if (isPlaying) {
        await wavesurfer.current.pause();
        setIsPlaying(false);
      } else {
        await wavesurfer.current.play();
        setIsPlaying(true);
        setShowTranscript(true); // Show transcript when playback starts
      }
    } catch (err) {
      console.error('Playback error:', err);
    } finally {
      playbackLock.current = false;
    }
  };

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

  return (
    <motion.div
      className={styles.postContainer}
      whileHover={{ boxShadow: '0px 5px 15px rgba(0,0,0,0.1)' }}
    >
      {/* Post Header */}
      <div className={styles.postHeader}>
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
                        className={`${styles.word} ${
                          isHighlighted ? styles.highlighted : ''
                        }`}
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
          disabled={!isReady}
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
        <div className={styles.interactionButton}>
          <FaHeart /> {post.likes || 0}
        </div>
        <div className={styles.interactionButton}>
          <FaComment /> {post.comments || 0}
        </div>
        <div className={styles.interactionButton}>
          <FaShareAlt /> Share
        </div>
      </div>
    </motion.div>
  );
};

export default Post;
