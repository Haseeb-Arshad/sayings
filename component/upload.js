// components/AnimatedAudioRecorder.js
import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/AudioRecorder.module.css';
import axios, { isNetworkOffline } from '../utils/axiosInstance';
import draftRecordingService from '../services/draftRecordingService';

const AnimatedAudioRecorder = ({ onNewPost, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const startTimeRef = useRef(null);
  const audioContextRef = useRef(null);

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
    if (!navigator.mediaDevices) {
      alert('Your browser does not support audio recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
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
      setTimeElapsed(0); // Reset the timer

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
      console.error('Error accessing microphone:', err);
      alert('Error accessing microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
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
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;

      setAudioLevel(0);
      setTimeElapsed(0);
      startTimeRef.current = null;

      setIsProcessing(true);

      const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
      setAudioBlob(blob);
      setAudioURL(URL.createObjectURL(blob));
      chunksRef.current = [];

      uploadAudio(blob).then((postData) => {
        setIsProcessing(false);
        if (postData) {
          setTranscript(postData.transcript || '');
          if (onNewPost) onNewPost(postData);
        }
      });
    }
  };

  const uploadAudio = async (blob) => {
    setIsProcessing(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', blob, 'recording.wav');

    try {
      const response = await axios.post('/transcribe', formData);
      const data = response.data;
      setTranscript(data.transcript || '');

      // Construct post object
      const post = {
        _id: data._id,
        audioURL: data.audioURL,
        transcript: data.transcript,
        topics: data.topics,
        timestamp: data.timestamp,
        likes: data.likes,
        comments: data.comments,
      };

      return post;
    } catch (error) {
      console.error('Error uploading audio:', error.response?.data || error.message);
      const errorMessage = error.isOffline 
        ? 'You are offline. Save as draft instead?' 
        : 'Error uploading audio for transcription. Save as draft instead?';
      setUploadError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const saveDraft = async () => {
    if (!audioBlob) return;
    try {
      await draftRecordingService.create(audioBlob, {
        title: 'Untitled',
        description: '',
        topics: [],
        transcript: transcript || '',
        privacy: 'public',
      });
      setUploadError(null);
      alert('Recording saved as draft. Go to Drafts to edit and publish.');
      setIsVisible(false);
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving draft:', error);
      setUploadError('Failed to save draft.');
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={styles.container}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose} // Close when clicking on the overlay
        >
          <motion.div
            className={styles.recorderContainer}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
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
              >
                {recording ? <FaStop /> : <FaMicrophone />}
                {recording ? 'Stop' : 'Start Recording'}
              </motion.button>

              {isProcessing && (
                <div className={styles.processingContainer}>
                  <div className={styles.processingSpinner} />
                  <p>Processing your audio...</p>
                </div>
              )}

              {uploadError && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.errorContainer}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginTop: '12px',
                    textAlign: 'center'
                  }}
                >
                  <p style={{ marginBottom: '12px', color: '#ef4444' }}>{uploadError}</p>
                  <motion.button
                    onClick={saveDraft}
                    className={styles.draftButton}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    Save as Draft
                  </motion.button>
                </motion.div>
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
  );
};

export default AnimatedAudioRecorder;
