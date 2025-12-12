// component/PostComposer.js

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import axios from '../utils/axiosInstance.js';
import { useAuth } from '../context/useAuth.js';
import { RefreshContext } from './providers.js';
import recordingService from '../services/RecordingService.js';
import uploadQueue from '../services/UploadQueue.js';
import analyticsService from '../services/AnalyticsService.js';
import { InlineRecordingError } from './RecordingError.js';

// Phases of the composer flow
export const ComposerPhase = Object.freeze({
  Idle: 'IDLE',
  Recording: 'RECORDING',
  Processing: 'PROCESSING',
  Review: 'REVIEW',
  Publishing: 'PUBLISHING',
  Done: 'DONE',
});

// Utility: focus trap within modal
function useFocusTrap(isOpen, containerRef) {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input[type="text"]:not([disabled])',
      'input[type="radio"]:not([disabled])',
      'input[type="checkbox"]:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];

    const getFocusable = () => Array.from(container.querySelectorAll(focusableSelectors.join(',')));

    // Focus the first focusable element on open
    const focusables = getFocusable();
    if (focusables.length) {
      focusables[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        const list = getFocusable();
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, containerRef]);
}

const spring = { type: 'spring', stiffness: 300, damping: 30, mass: 0.3 };

// These will be overridden at runtime if user prefers reduced motion
let sheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: spring },
  exit: { y: '100%', opacity: 0, transition: { ...spring, damping: 35 } },
};

let modalVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: spring },
  exit: { scale: 0.98, opacity: 0, transition: { ...spring, damping: 35 } },
};

// A lightweight timer for recording duration display
function useTicker(active) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return seconds;
}

export default function PostComposer({ isOpen, onClose, onPublished }) {
  const { user } = useAuth();
  const refreshPosts = useContext(RefreshContext);

  const prefersReducedMotion = useReducedMotion();

  // Adjust variants if user prefers reduced motion
  if (prefersReducedMotion) {
    sheetVariants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0 } },
      exit: { opacity: 0, transition: { duration: 0 } },
    };
    modalVariants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0 } },
      exit: { opacity: 0, transition: { duration: 0 } },
    };
  }

  const [phase, setPhase] = useState(ComposerPhase.Idle);
  const [error, setError] = useState(null);
  const [blob, setBlob] = useState(null);
  const [audioURL, setAudioURL] = useState('');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review phase UI state
  const [transcript, setTranscript] = useState('');
  const [editingWordIndex, setEditingWordIndex] = useState(null);
  const [editingWordValue, setEditingWordValue] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [privacy, setPrivacy] = useState('public'); // 'public' | 'private'

  // Mini audio player state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Media recording state
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);

  const containerRef = useRef(null);
  useFocusTrap(isOpen, containerRef);

  // Close handler with cleanup
  const handleClose = useCallback(() => {
    cleanupMedia();
    setPhase(ComposerPhase.Idle);
    setError(null);
    setBlob(null);
    setAudioURL('');
    setTitle('');
    setTranscript('');
    setSelectedTopics([]);
    setPrivacy('public');
    setEditingWordIndex(null);
    setEditingWordValue('');
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (onClose) onClose();
  }, [onClose]);

  // Esc to close, Space to start/stop, Enter to publish (when appropriate)
  useEffect(() => {
    if (!isOpen) return;
    const isTypingTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        el.isContentEditable ||
        (el.getAttribute && el.getAttribute('role') === 'textbox')
      );
    };

    const onKey = (e) => {
      // Close on Escape
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
        return;
      }

      // Avoid interfering with typing
      if (isTypingTarget(document.activeElement)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Space toggles recording when in Idle/Recording
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (phase === ComposerPhase.Recording) {
          stopRecording();
        } else if (phase === ComposerPhase.Idle) {
          startRecording();
        }
      }

      // Enter publishes from Review
      if (e.key === 'Enter') {
        if (phase === ComposerPhase.Review) {
          e.preventDefault();
          publish();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose, phase]);

  // Prevent body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Lifecycle: reset when opened
  useEffect(() => {
    if (isOpen) {
      setPhase(ComposerPhase.Idle);
      setError(null);
    } else {
      cleanupMedia();
    }
  }, [isOpen]);

  const canRecord = typeof window !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const startRecording = async () => {
    setError(null);
    if (!user) {
      setError('You need to be signed in to record.');
      return;
    }
    if (!recordingService.isSupported()) {
      const categorized = recordingService.categorizeError(
        new Error('MediaRecorder not supported')
      );
      setError(categorized.message);
      return;
    }
    try {
      const stream = await recordingService.requestMicrophonePermission();
      mediaStreamRef.current = stream;
      const mediaRecorder = recordingService.createMediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        try {
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const recordedBlob = recordingService.createBlob(chunksRef.current, mimeType);
          
          if (!recordingService.validateBlob(recordedBlob)) {
            throw new Error('Invalid audio recording');
          }
          
          setBlob(recordedBlob);
          const url = URL.createObjectURL(recordedBlob);
          setAudioURL(url);
          setPhase(ComposerPhase.Processing);
          setTimeout(() => setPhase(ComposerPhase.Review), 600);
        } catch (err) {
          console.error('Error creating blob:', err);
          const categorized = err.categorized || recordingService.categorizeError(err);
          setError(categorized.message);
          setPhase(ComposerPhase.Idle);
        }
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setPhase(ComposerPhase.Recording);
    } catch (err) {
      console.error(err);
      const categorized = err.categorized || recordingService.categorizeError(err);
      setError(categorized.message);
    }
  };

  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (e) {
      // ignore
    }
  };

  const cleanupMedia = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch {}
    mediaRecorderRef.current = null;
    try {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    mediaStreamRef.current = null;
    chunksRef.current = [];
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
  };

  const seconds = useTicker(phase === ComposerPhase.Recording);

  const mmss = useMemo(() => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [seconds]);

const publish = async () => {
    if (!blob) {
      setError('No audio captured.');
      return;
    }
    if (!user) {
      setError('You must be signed in to publish.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setPhase(ComposerPhase.Publishing);
    try {
      const form = new FormData();
      form.append('title', title || 'Untitled');
      form.append('file', blob, 'recording.webm');
      form.append('transcript', transcript || '');
      form.append('topics', JSON.stringify(selectedTopics));
      form.append('privacy', privacy);

      const res = await axios.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });

      analyticsService.logUploadSuccess({
        size: blob.size,
        endpoint: '/posts'
      });

      try { refreshPosts && refreshPosts(); } catch {}

      setPhase(ComposerPhase.Done);
      setIsSubmitting(false);
      if (onPublished) onPublished(res.data);
    } catch (e) {
      console.error(e);
      const categorized = recordingService.categorizeError(e);
      
      analyticsService.logUploadError(
        categorized.type,
        categorized.originalMessage,
        { size: blob.size, endpoint: '/posts' }
      );

      setIsSubmitting(false);
      setPhase(ComposerPhase.Review);
      setError(categorized.message);

      if (categorized.isRetryable) {
        uploadQueue.addToUploadQueue(blob, {
          title: title || 'Untitled',
          transcript: transcript || '',
          topics: selectedTopics,
          privacy,
          endpoint: '/posts'
        }).catch(err => {
          console.error('Failed to add to upload queue:', err);
        });
      }
    }
  };

  // Phase-specific content components to keep render small
  // Basic keyword extraction for topic suggestions
  const stopwords = new Set([
    'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','person','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us'
  ]);
  const topicSuggestions = useMemo(() => {
    const counts = new Map();
    transcript
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w) => {
        if (w.length < 4) return;
        if (stopwords.has(w)) return;
        counts.set(w, (counts.get(w) || 0) + 1);
      });
    return Array.from(counts.entries())
      .sort((a,b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w]) => w);
  }, [transcript]);

  const words = useMemo(() => transcript.split(/(\s+)/), [transcript]);
  const totalChars = transcript.length;
  const TRANSCRIPT_CHAR_LIMIT = 5000;

  const replaceWordAtIndex = (idx, value) => {
    // words includes separators; find the nth word token index
    const tokens = transcript.split(/(\s+)/);
    let wordCount = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (!/\s+/.test(tokens[i])) {
        wordCount++;
        if (wordCount === idx) {
          tokens[i] = value;
          break;
        }
      }
    }
    setTranscript(tokens.join(''));
  };

  const handleWordClick = (idx, currentValue) => {
    setEditingWordIndex(idx);
    setEditingWordValue(currentValue);
  };

  const handleWordEditCommit = () => {
    if (editingWordIndex === null) return;
    replaceWordAtIndex(editingWordIndex, editingWordValue);
    setEditingWordIndex(null);
    setEditingWordValue('');
  };

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  // Audio controls
  const onPlayPause = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play().catch(() => {});
    }
  };
  const onTimeUpdate = () => {
    const el = audioRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime || 0);
  };
  const onLoadedMeta = () => {
    const el = audioRef.current;
    if (!el) return;
    setDuration(el.duration || 0);
  };
  const onSeek = (e) => {
    const el = audioRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(1, Math.max(0, x / rect.width));
    const t = pct * (duration || 0);
    el.currentTime = t;
    setCurrentTime(t);
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    el.addEventListener('ended', onEnded);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [audioRef.current]);

  const fmtTime = (t) => {
    const s = Math.floor(t || 0);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const r = (s % 60).toString().padStart(2, '0');
    return `${m}:${r}`;
  };


  // Live region for screen readers announcing phase changes
  const [liveMessage, setLiveMessage] = useState('');
  useEffect(() => {
    let msg = '';
    switch (phase) {
      case ComposerPhase.Idle:
        msg = 'Composer ready. Press space to start recording.';
        break;
      case ComposerPhase.Recording:
        msg = `Recording started. Elapsed ${mmss}. Press space to stop.`;
        break;
      case ComposerPhase.Processing:
        msg = 'Processing your recording.';
        break;
      case ComposerPhase.Review:
        msg = 'Review your post. Press Enter to publish.';
        break;
      case ComposerPhase.Publishing:
        msg = 'Publishing your post.';
        break;
      case ComposerPhase.Done:
        msg = 'Post published.';
        break;
      default:
        msg = '';
    }
    setLiveMessage(msg);
  }, [phase, mmss]);

  const renderContent = () => {
    switch (phase) {
      case ComposerPhase.Idle:
        return (
          <div className="p-4">
            <h2 id="composer-title" className="text-lg font-semibold">Create a new post</h2>
            <p className="mt-1 text-sm text-gray-500">Record audio and share your saying.</p>
            {error && (
              <div className="mt-3">
                <InlineRecordingError 
                  error={{ 
                    message: error, 
                    isRetryable: false 
                  }} 
                />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={startRecording}
                aria-label="Start recording"
              >
                Start recording
              </button>
              <button
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                onClick={handleClose}
                aria-label="Close composer"
              >
                Cancel
              </button>
            </div>
            {!user && (
              <p className="mt-3 text-sm text-amber-600" role="status">Sign in to publish.</p>
            )}
          </div>
        );
      case ComposerPhase.Recording:
        return (
          <div className="p-4">
            <h2 className="text-lg font-semibold">Recording… <span className="text-sm text-gray-500">{mmss}</span></h2>
            <p className="mt-1 text-sm text-gray-500">Speak now. Your microphone is active.</p>
            <div className="mt-4 flex gap-2">
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                onClick={stopRecording}
                aria-label="Stop recording"
              >
                Stop
              </button>
              <button
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                onClick={handleClose}
                aria-label="Cancel and close"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      case ComposerPhase.Processing:
        return (
          <div className="p-6 flex flex-col items-center text-center" aria-busy="true">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" aria-hidden />
            <p className="mt-3 text-sm text-gray-600">Processing your recording…</p>
          </div>
        );
      case ComposerPhase.Review:
        return (
          <div className="p-4">
            <h2 className="text-lg font-semibold">Review and publish</h2>

            {/* Mini audio player with scrubbing */}
            {audioURL && (
              <div className="mt-3 w-full rounded-md border border-gray-200 p-3">
                <div className="flex items-center gap-3">
                  <button
                    className="px-3 py-1 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    onClick={onPlayPause}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <div className="text-xs tabular-nums text-gray-600 min-w-[56px] text-right">
                    {fmtTime(currentTime)} / {fmtTime(duration)}
                  </div>
                </div>
                <div
                  className="mt-2 h-2 w-full rounded bg-gray-200 cursor-pointer"
                  onClick={onSeek}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={duration || 0}
                  aria-valuenow={currentTime}
                  aria-label="Seek"
                >
                  <div
                    className="h-2 rounded bg-blue-500"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <audio
                  ref={audioRef}
                  src={audioURL}
                  className="hidden"
                  onLoadedMetadata={onLoadedMeta}
                  onTimeUpdate={onTimeUpdate}
                />
              </div>
            )}

            {/* Title input */}
            <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="post-title">Title</label>
            <input
              id="post-title"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give it a title"
              aria-required="true"
            />

            {/* Editable transcript with word-level correction */}
            <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="transcript">Transcript</label>
            <textarea
              id="transcript"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type what you said or paste the transcript here"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={5}
            />
            <div className="mt-1 text-xs text-gray-500">{totalChars} / {TRANSCRIPT_CHAR_LIMIT} characters</div>

            {/* Word-level correction UI */}
            {transcript.trim().length > 0 && (
              <div className="mt-3 rounded-md border border-gray-200 p-2">
                <div className="text-xs text-gray-500 mb-2">Tap a word to correct it</div>
                <div className="flex flex-wrap gap-1">
                  {words.map((token, i) => {
                    const isSpace = /\s+/.test(token);
                    if (isSpace) return <span key={i}>{token}</span>;
                    // Determine the ordinal index among word tokens
                    let ordinal = -1;
                    const tokens = transcript.split(/(\s+)/);
                    for (let k = 0, n = 0; k < tokens.length; k++) {
                      if (!/\s+/.test(tokens[k])) {
                        if (tokens[k] === token && k === i) {
                          ordinal = n;
                          break;
                        }
                        n++;
                      }
                    }
                    const indexAmongWords = ordinal === -1 ? 0 : ordinal;
                    if (editingWordIndex === indexAmongWords) {
                      return (
                        <input
                          key={i}
                          className="px-1 py-0.5 border rounded text-sm"
                          value={editingWordValue}
                          onChange={(e) => setEditingWordValue(e.target.value)}
                          onBlur={handleWordEditCommit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleWordEditCommit(); }
                            if (e.key === 'Escape') { setEditingWordIndex(null); setEditingWordValue(''); }
                          }}
                          autoFocus
                          style={{ maxWidth: 200 }}
                        />
                      );
                    }
                    return (
                      <button
                        key={i}
                        className="text-sm px-1 rounded hover:bg-yellow-100 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                        onClick={() => handleWordClick(indexAmongWords, token)}
                        type="button"
                        aria-label={`Edit word ${token}`}
                      >
                        {token}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Topic chips */}
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700">Topics</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {topicSuggestions.length === 0 && (
                  <span className="text-xs text-gray-500">No suggestions yet. Start by adding a transcript.</span>
                )}
                {topicSuggestions.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className={`px-3 py-1 rounded-full border text-sm ${selectedTopics.includes(topic) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'}`}
                    aria-pressed={selectedTopics.includes(topic)}
                  >
                    {selectedTopics.includes(topic) ? '✓ ' : ''}{topic}
                  </button>
                ))}
              </div>
              {selectedTopics.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">Selected: {selectedTopics.join(', ')}</div>
              )}
            </div>

            {/* Privacy toggle */}
            <div className="mt-4 flex items-center gap-3">
              <div className="text-sm font-medium text-gray-700">Privacy</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`px-3 py-1 rounded-full border text-sm ${privacy === 'public' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'}`}
                  onClick={() => setPrivacy('public')}
                  aria-pressed={privacy === 'public'}
                >
                  Public
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded-full border text-sm ${privacy === 'private' ? 'bg-amber-600 text-white border-amber-600' : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'}`}
                  onClick={() => setPrivacy('private')}
                  aria-pressed={privacy === 'private'}
                >
                  Private
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-3">
                <InlineRecordingError 
                  error={{ 
                    message: error, 
                    isRetryable: false 
                  }} 
                />
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={publish}
                disabled={isSubmitting}
                aria-label="Publish post"
              >
                {isSubmitting ? 'Publishing…' : 'Publish'}
              </button>
              <button
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
                onClick={() => setPhase(ComposerPhase.Idle)}
                disabled={isSubmitting}
                aria-label="Start over"
              >
                {isSubmitting ? 'Please wait…' : 'Start over'}
              </button>
              <button
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
                onClick={handleClose}
                disabled={isSubmitting}
                aria-label="Close composer"
              >
                {isSubmitting ? 'Please wait…' : 'Close'}
              </button>
            </div>
          </div>
        );
      case ComposerPhase.Publishing:
        return (
          <div className="p-6 flex flex-col items-center text-center" aria-busy="true">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" aria-hidden />
            <p className="mt-3 text-sm text-gray-600">Publishing your post…</p>
          </div>
        );
      case ComposerPhase.Done:
        return (
          <div className="p-6 text-center">
            <h2 className="text-lg font-semibold">All set!</h2>
            <p className="mt-1 text-sm text-gray-600">Your post has been published.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={handleClose}
                aria-label="Close composer"
              >
                Close
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  // Overlay click closes; inner content stops propagation
  const onOverlayClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="composer-title"
          className="fixed inset-0 z-50"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onOverlayClick}
          />

          {/* Live region for screen readers */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">{liveMessage}</div>

          {/* Desktop centered modal */}
          <div className="hidden md:grid place-items-center h-full">
            <motion.div
              ref={containerRef}
              className="relative w-full max-w-md rounded-xl bg-white shadow-xl outline-none"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="document"
              tabIndex={-1}
            >
              <header className="sr-only">
                <h2 id="composer-title">Post composer</h2>
              </header>
              <button
                className="absolute right-3 top-3 rounded-md p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={handleClose}
                aria-label="Close"
              >
                <span aria-hidden>✕</span>
              </button>
              <PhaseTransition phaseKey={phase} reduce={prefersReducedMotion}>{renderContent()}</PhaseTransition>
            </motion.div>
          </div>

          {/* Mobile bottom sheet */}
          <div className="md:hidden absolute inset-x-0 bottom-0">
            <motion.div
              ref={containerRef}
              className="relative w-full rounded-t-2xl bg-white shadow-xl outline-none"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="document"
              tabIndex={-1}
            >
              <div className="absolute left-1/2 -top-2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-gray-300" aria-hidden />
              <button
                className="absolute right-3 top-3 rounded-md p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={handleClose}
                aria-label="Close"
              >
                <span aria-hidden>✕</span>
              </button>
              <PhaseTransition phaseKey={phase} reduce={prefersReducedMotion}>{renderContent()}</PhaseTransition>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

function PhaseTransition({ phaseKey, reduce = false, children }) {
  if (reduce) {
    return <div key={phaseKey}>{children}</div>;
  }
  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={phaseKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 250, damping: 24, mass: 0.25 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

