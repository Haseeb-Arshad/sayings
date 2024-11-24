// components/AudioRecorder.js

'use client';

import { useState, useRef, useEffect } from 'react';
import axios from '../utils/axiosInstance';
import styles from '../styles/AudioRecorder.module.css';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import { motion } from 'framer-motion';

const AudioRecorder = ({ onNewPost }) => {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [topics, setTopics] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const animationFrameIdRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const startTimeRef = useRef(null);

  const startRecording = async () => {
    if (!navigator.mediaDevices) {
      alert('Your browser does not support audio recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
      startTimer();

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let values = 0;
        for (let i = 0; i < bufferLength; i++) {
          values += dataArray[i];
        }
        const average = values / bufferLength;
        setAudioLevel(average);
        animationFrameIdRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        chunksRef.current = [];
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        stopTimer();
        stream.getTracks().forEach((track) => track.stop());
        audioContext.close();
        cancelAnimationFrame(animationFrameIdRef.current);
        setAudioLevel(0);

        const postData = await uploadAudio(blob);
        if (onNewPost && postData) onNewPost(postData);
      };
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Error accessing microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadAudio = async (blob) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', blob, 'recording.wav');

    try {
      const response = await axios.post('/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      setTranscript(data.transcript || '');
      setTopics(data.topics || []);

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

      setIsUploading(false);
      return post;
    } catch (error) {
      console.error('Error uploading audio:', error.response?.data || error.message);
      alert('Error uploading audio for transcription.');
      setIsUploading(false);
      return null;
    }
  };

  const startTimer = () => {
    startTimeRef.current = Date.now();
    const timer = () => {
      setTimeElapsed(((Date.now() - startTimeRef.current) / 1000).toFixed(1));
      animationFrameIdRef.current = requestAnimationFrame(timer);
    };
    timer();
  };

  const stopTimer = () => {
    cancelAnimationFrame(animationFrameIdRef.current);
    setTimeElapsed(0);
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, []);

  return (
    <div
      className={styles.recorderContainer}
      style={{
        background: `linear-gradient(135deg, rgba(29,161,242,${audioLevel / 256}), rgba(13,149,232,${
          audioLevel / 256
        }))`,
      }}
    >
      <h2 className={styles.title}>Record Your Voice</h2>
      <div className={styles.visualizerContainer}>
        <div
          className={styles.visualizer}
          style={{ transform: `scaleY(${audioLevel / 256})` }}
        ></div>
      </div>
      <div className={styles.timer}>{timeElapsed ? `${timeElapsed}s` : ''}</div>
      <div className={styles.buttonContainer}>
        {!recording ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startRecording}
            className={styles.recordButton}
          >
            <FaMicrophone size={20} className={styles.icon} /> Start Recording
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopRecording}
            className={styles.stopButton}
          >
            <FaStop size={20} className={styles.icon} /> Stop Recording
          </motion.button>
        )}
      </div>

      {isUploading && (
        <div className={styles.loaderContainer}>
          <div className={styles.loader}></div>
          <p className={styles.loadingText}>Uploading and processing...</p>
        </div>
      )}

      {audioURL && (
        <div className={styles.audioContainer}>
          <h3 className={styles.subtitle}>Recorded Audio:</h3>
          <audio controls src={audioURL} className={styles.audioPlayer}></audio>
        </div>
      )}

      {transcript && (
        <div className={styles.transcriptContainer}>
          <h3 className={styles.subtitle}>Transcription:</h3>
          <p className={styles.transcript}>{transcript}</p>
        </div>
      )}

      {topics.length > 0 && (
        <div className={styles.topicsContainer}>
          <h3 className={styles.subtitle}>Detected Topics:</h3>
          <ul className={styles.topicsList}>
            {topics.map((topic, index) => (
              <li key={index} className={styles.topicItem}>
                {topic.topic} ({(topic.confidence * 100).toFixed(1)}%)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
