'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import styles from '../styles/AudioRecorder.module.css';
import axios from '../utils/axiosInstance';

const AnimatedAudioRecorder = ({ onNewPost, onClose }) => {
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
      console.error('Error accessing microphone:', err);
      alert('Error accessing microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;

      setAudioLevel(0);
      setTimeElapsed(0);
      startTimeRef.current = null;

      setIsProcessing(true);

      const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
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
    const formData = new FormData();
    formData.append('file', blob, 'recording.wav');

    try {
      const response = await axios.post('/transcribe', formData);
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

      return post;
    } catch (error) {
      console.error('Error uploading audio:', error.response?.data || error.message);
      alert('Error uploading audio for transcription.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={styles.container}
      onClick={() => {
        setIsVisible(false);
        if (onClose) onClose();
      }}
    >
      <div
        className={styles.recorderContainer}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: isProcessing
            ? 'linear-gradient(135deg, rgba(147,51,234,0.9), rgba(192,38,211,0.8))'
            : `linear-gradient(135deg, rgba(59,130,246,${0.5 + audioLevel / 512}), rgba(37,99,235,${0.5 + audioLevel / 512}))`,
        }}
      >
        <div className={`${styles.innerContent} ${recording ? styles.innerPulsing : ''}`}>
          <button
            className={styles.closeButton}
            onClick={() => {
              setIsVisible(false);
              if (onClose) onClose();
            }}
            type="button"
            aria-label="Close recorder"
          >
            &times;
          </button>

          <div className={styles.visualizer}>
            <div className={`${styles.wave} ${recording ? styles.waveAnimating : ''}`} />
          </div>

          {recording && <div className={styles.timer}>{timeElapsed}s</div>}

          <button
            className={recording ? styles.stopButton : styles.recordButton}
            onClick={recording ? stopRecording : startRecording}
            type="button"
          >
            {recording ? <FaStop /> : <FaMicrophone />}
            {recording ? 'Stop' : 'Start Recording'}
          </button>

          {isProcessing && (
            <div className={styles.processingContainer}>
              <div className={styles.processingSpinner} />
              <p>Processing your audio...</p>
            </div>
          )}

          {transcript && (
            <div className={styles.transcriptContainer}>
              <p>{transcript}</p>
            </div>
          )}

          {audioURL && (
            <audio controls preload="none" src={audioURL} style={{ width: '100%' }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimatedAudioRecorder;
