// components/AnimatedAudioRecorder.js
import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/AudioRecorder.module.css';
import axios from '../utils/axiosInstance.js';
import recordingService from '../services/RecordingService.js';
import uploadQueue from '../services/UploadQueue.js';
import analyticsService from '../services/AnalyticsService.js';
import RecordingError from './RecordingError.js';
import { calculateBackoffDelay, formatDelay } from '../utils/exponentialBackoff.js';

const AnimatedAudioRecorder = ({ onNewPost, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryDelay, setRetryDelay] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const startTimeRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    
    if (!recordingService.isSupported()) {
      const categorized = recordingService.categorizeError(
        new Error('MediaRecorder not supported')
      );
      setError(categorized);
      return;
    }

    try {
      const stream = await recordingService.requestMicrophonePermission();
      streamRef.current = stream;
      
      const mediaRecorder = recordingService.createMediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      analyserRef.current = analyser;

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
      startTimeRef.current = Date.now();
      setTimeElapsed(0);

      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTimeElapsed(elapsed);
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      };
      updateTimer();

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.start();
      setRecording(true);

    } catch (err) {
      console.error('Error starting recording:', err);
      const categorized = err.categorized || recordingService.categorizeError(err);
      setError(categorized);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      const recorder = mediaRecorderRef.current;
      const recordingDuration = timeElapsed;
      
      recorder.onstop = () => {
        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = recordingService.createBlob(chunksRef.current, mimeType);
          
          if (!recordingService.validateBlob(blob)) {
            throw new Error('Invalid audio recording');
          }

          setAudioURL(URL.createObjectURL(blob));
          chunksRef.current = [];
          setIsProcessing(true);

          uploadAudioWithRetry(blob, recordingDuration);
        } catch (err) {
          console.error('Error creating blob:', err);
          const categorized = err.categorized || recordingService.categorizeError(err);
          setError(categorized);
          setIsProcessing(false);
        }
      };

      recorder.stop();
      setRecording(false);

      // Stop audio level animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Disconnect analyser
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Stop media stream tracks
      if (streamRef.current) {
        recordingService.stopStream(streamRef.current);
        streamRef.current = null;
      }

      setAudioLevel(0);
      setTimeElapsed(0);
      startTimeRef.current = null;
      mediaRecorderRef.current = null;
    }
  };

  const uploadAudioWithRetry = async (blob, duration, attempt = 0) => {
    const MAX_RETRIES = 3;
    
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const response = await axios.post('/transcribe', formData, {
        timeout: 60000
      });
      
      const data = response.data;
      setTranscript(data.transcript || '');

      const post = {
        _id: data._id,
        audioURL: data.audioURL,
        transcript: data.transcript,
        topics: data.topics,
        timestamp: data.timestamp,
        likes: data.likes,
        comments: data.comments,
      };

      analyticsService.logUploadSuccess({
        duration,
        size: blob.size,
        retryCount: attempt
      });

      setIsProcessing(false);
      setError(null);
      setRetryCount(0);
      
      if (onNewPost) onNewPost(post);
      
      return post;
    } catch (error) {
      console.error('Error uploading audio:', error.response?.data || error.message);
      
      const categorized = recordingService.categorizeError(error);
      
      if (attempt < MAX_RETRIES && categorized.isRetryable && navigator.onLine) {
        const delay = calculateBackoffDelay(attempt);
        const delayText = formatDelay(delay);
        
        setRetryCount(attempt + 1);
        setRetryDelay(`Retrying in ${delayText}...`);
        setError(categorized);
        
        analyticsService.logUploadRetry(attempt + 1, delay, {
          errorType: categorized.type,
          duration,
          size: blob.size
        });

        setTimeout(() => {
          setRetryDelay(null);
          uploadAudioWithRetry(blob, duration, attempt + 1);
        }, delay);
      } else {
        setIsProcessing(false);
        setError(categorized);
        
        if (!categorized.isRetryable || attempt >= MAX_RETRIES) {
          analyticsService.logUploadFailedPermanent(
            categorized.type,
            attempt,
            { duration, size: blob.size }
          );
        }
        
        uploadQueue.addToUploadQueue(blob, {
          duration,
          endpoint: '/transcribe',
          timestamp: Date.now()
        }).catch(err => {
          console.error('Failed to add to upload queue:', err);
        });
      }
      
      return null;
    }
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(0);
    setRetryDelay(null);
  };

  const handleDismissError = () => {
    setError(null);
    setRetryCount(0);
    setRetryDelay(null);
  };

  return (
    <>
      <RecordingError
        error={error}
        onRetry={handleRetry}
        onDismiss={handleDismissError}
        retryDelay={retryDelay}
        retryCount={retryCount}
        maxRetries={3}
      />
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={styles.container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className={styles.recorderContainer}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              style={{
                background: isProcessing
                  ? "linear-gradient(135deg, rgba(147,51,234,0.9), rgba(192,38,211,0.8))"
                  : `linear-gradient(135deg, rgba(59,130,246,${0.5 + audioLevel/512}), rgba(37,99,235,${0.5 + audioLevel/512}))`,
              }}
            >
              <motion.div
                className={styles.innerContent}
                animate={{ scale: recording ? [1, 1.02, 1] : 1 }}
                transition={{ repeat: recording ? Infinity : 0, duration: 1.5 }}
              >
                <button
                  className={styles.closeButton}
                  onClick={() => {
                    setIsVisible(false);
                    if (onClose) onClose();
                  }}
                >
                  &times;
                </button>

                <div className={styles.visualizer}>
                  <motion.div
                    className={styles.wave}
                    animate={{
                      height: recording ? [20, 40, 20] : 20,
                      opacity: recording ? [0.5, 1, 0.5] : 0.5
                    }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                </div>

                {recording && (
                  <div className={styles.timer}>{timeElapsed}s</div>
                )}

                <motion.button
                  className={recording ? styles.stopButton : styles.recordButton}
                  onClick={recording ? stopRecording : startRecording}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isProcessing}
                >
                  {recording ? <FaStop /> : <FaMicrophone />}
                  {recording ? 'Stop' : 'Start Recording'}
                </motion.button>

                {isProcessing && (
                  <div className={styles.processingContainer}>
                    <div className={styles.processingSpinner} />
                    <p>{retryDelay || 'Processing your audio...'}</p>
                  </div>
                )}

                {transcript && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.transcriptContainer}
                  >
                    <p>{transcript}</p>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AnimatedAudioRecorder;
