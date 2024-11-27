import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/AudioRecorder.module.css';

const AnimatedAudioRecorder = ({ onNewPost }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      analyserRef.current = analyser;
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = Array.from(dataArray).reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      startTimeRef.current = Date.now();
      
      const updateTimer = () => {
        setTimeElapsed(((Date.now() - startTimeRef.current) / 1000).toFixed(1));
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      };
      updateTimer();

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.start();
      setRecording(true);

    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setIsProcessing(true);
      
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioURL(URL.createObjectURL(blob));
        chunksRef.current = [];
        
        // Simulate processing delay
        setTimeout(() => {
          setTranscript("This is a sample transcription of the recorded audio...");
          setIsProcessing(false);
        }, 2000);
      };
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className={styles.container}
        >
          <motion.div
            className={styles.recorderContainer}
            animate={{
              background: isProcessing
                ? "linear-gradient(135deg, rgba(147,51,234,0.9), rgba(192,38,211,0.8))"
                : `linear-gradient(135deg, rgba(59,130,246,${0.5 + audioLevel/512}), rgba(37,99,235,${0.5 + audioLevel/512}))`
            }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className={styles.innerContent}
              animate={{ scale: recording ? [1, 1.02, 1] : 1 }}
              transition={{ repeat: recording ? Infinity : 0, duration: 1.5 }}
            >
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

              {timeElapsed > 0 && (
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