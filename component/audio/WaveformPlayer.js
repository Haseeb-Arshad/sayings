'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  FaPlay,
  FaPause,
  FaHeadphones,
  FaStepBackward,
  FaStepForward,
  FaVolumeUp,
  FaVolumeMute,
  FaSyncAlt,
  FaSpinner,
} from 'react-icons/fa';
import styles from '../../styles/Post.module.css';

const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

const DEFAULT_PLAYBACK_RATES = [0.75, 1.0, 1.25, 1.5];

function formatTime(time) {
  if (isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

const WaveformPlayer = forwardRef(function WaveformPlayer(
  { audioPinataURL, words, onHighlightChange },
  ref
) {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const playbackLock = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [wavesurferInitialized, setWavesurferInitialized] = useState(false);

  const [playbackRateIndex, setPlaybackRateIndex] = useState(1);
  const playbackRates = DEFAULT_PLAYBACK_RATES;
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  const audioSrc = audioPinataURL?.startsWith('http')
    ? audioPinataURL
    : `${PINATA_GATEWAY}${audioPinataURL || ''}`;

  const updateHighlightedWord = useCallback(
    (t) => {
      if (!words || words.length === 0) return;

      const wordIndex = words.findIndex(
        (word) => t >= word.start / 1000 && t <= word.end / 1000
      );

      onHighlightChange?.(wordIndex !== -1 ? wordIndex : null);
    },
    [onHighlightChange, words]
  );

  const initializeWaveSurfer = useCallback(async () => {
    if (wavesurferInitialized || !waveformRef.current || !audioSrc) return;

    const { default: WaveSurfer } = await import('wavesurfer.js');

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#E0E0E0',
      progressColor: '#1DA1F2',
      cursorColor: 'transparent',
      barWidth: 1,
      barRadius: 1,
      barGap: 1,
      height: 36,
      normalize: true,
      responsive: true,
      partialRender: true,
      backend: 'WebAudio',
    });

    wavesurfer.current.on('ready', () => {
      setDuration(wavesurfer.current.getDuration());
      setIsReady(true);
      setIsBuffering(false);
      try {
        wavesurfer.current.setVolume(muted ? 0 : volume);
        wavesurfer.current.setPlaybackRate(playbackRates[playbackRateIndex]);
      } catch {}
    });

    wavesurfer.current.on('audioprocess', () => {
      const ct = wavesurfer.current.getCurrentTime();
      setCurrentTime(ct);
      updateHighlightedWord(ct);
    });

    wavesurfer.current.on('seek', () => {
      const ct = wavesurfer.current.getCurrentTime();
      setCurrentTime(ct);
      setIsBuffering(false);
      updateHighlightedWord(ct);
    });

    wavesurfer.current.on('loading', (perc) => {
      setIsBuffering(perc < 100);
    });

    wavesurfer.current.on('error', (e) => {
      console.error('WaveSurfer error:', e);
      setIsBuffering(false);
    });

    wavesurfer.current.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      playbackLock.current = false;
      try {
        wavesurfer.current.seekTo(0);
      } catch {}
      onHighlightChange?.(null);
    });

    await wavesurfer.current.load(audioSrc);
    setWavesurferInitialized(true);
  }, [
    audioSrc,
    muted,
    onHighlightChange,
    playbackRateIndex,
    playbackRates,
    updateHighlightedWord,
    volume,
    wavesurferInitialized,
  ]);

  const togglePlay = useCallback(async () => {
    if (playbackLock.current) return;

    try {
      playbackLock.current = true;

      if (!wavesurferInitialized) {
        await initializeWaveSurfer();
      }
      if (!wavesurfer.current) return;

      if (isPlaying) {
        await wavesurfer.current.pause();
        setIsPlaying(false);
      } else {
        setIsBuffering(false);
        await wavesurfer.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Playback error:', err);
    } finally {
      playbackLock.current = false;
    }
  }, [initializeWaveSurfer, isPlaying, wavesurferInitialized]);

  const skip = useCallback(
    (secs) => {
      if (!wavesurfer.current || !duration) return;
      const cur = wavesurfer.current.getCurrentTime() || 0;
      const t = clamp(cur + secs, 0, duration);
      wavesurfer.current.seekTo(duration ? t / duration : 0);
    },
    [duration]
  );

  const setNextRate = useCallback(() => {
    const next = (playbackRateIndex + 1) % playbackRates.length;
    setPlaybackRateIndex(next);
    try {
      wavesurfer.current?.setPlaybackRate(playbackRates[next]);
    } catch {}
  }, [playbackRateIndex, playbackRates]);

  const onVolumeChange = useCallback((val) => {
    const v = clamp(val, 0, 1);
    setVolume(v);
    setMuted(v === 0);
    try {
      wavesurfer.current?.setVolume(v);
    } catch {}
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !muted;
    setMuted(newMuted);
    try {
      wavesurfer.current?.setVolume(newMuted ? 0 : volume);
    } catch {}
  }, [muted, volume]);

  useImperativeHandle(
    ref,
    () => ({
      ensureInitialized: initializeWaveSurfer,
      seekToSeconds: (seconds) => {
        if (!wavesurfer.current || !duration) return;
        const t = clamp(seconds, 0, duration);
        wavesurfer.current.seekTo(duration ? t / duration : 0);
      },
    }),
    [duration, initializeWaveSurfer]
  );

  useEffect(() => {
    // On the post detail route we want the waveform ready quickly; this still code-splits
    // WaveSurfer into this component chunk and keeps it off list routes.
    initializeWaveSurfer().catch(() => {});
  }, [initializeWaveSurfer]);

  useEffect(() => {
    return () => {
      try {
        wavesurfer.current?.destroy();
      } catch {}
    };
  }, []);

  if (!audioPinataURL) {
    return null;
  }

  return (
    <div className={styles.audioPlayer}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          className={styles.iconButton}
          onClick={() => skip(-10)}
          aria-label="Skip back 10 seconds"
          disabled={!isReady}
          style={{ minWidth: 44, minHeight: 44 }}
          type="button"
        >
          <FaStepBackward />
        </button>

        <button
          className={styles.playPauseButton}
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{ minWidth: 56, minHeight: 56 }}
          type="button"
        >
          {isBuffering ? (
            <FaSpinner className={styles.spin} size={20} />
          ) : isPlaying ? (
            <FaPause size={20} />
          ) : (
            <FaPlay size={20} />
          )}
        </button>

        <button
          className={styles.iconButton}
          onClick={() => skip(10)}
          aria-label="Skip forward 10 seconds"
          disabled={!isReady}
          style={{ minWidth: 44, minHeight: 44 }}
          type="button"
        >
          <FaStepForward />
        </button>

        <button
          className={styles.iconButton}
          onClick={setNextRate}
          aria-label={`Playback rate ${playbackRates[playbackRateIndex]}x`}
          disabled={!isReady}
          style={{ minWidth: 56, minHeight: 44 }}
          type="button"
        >
          <FaSyncAlt style={{ marginRight: 6 }} />
          {playbackRates[playbackRateIndex]}x
        </button>

        <button
          className={styles.iconButton}
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          style={{ minWidth: 44, minHeight: 44 }}
          type="button"
        >
          {muted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          aria-label="Volume"
          className={styles.volumeSlider}
          style={{ touchAction: 'none' }}
        />
      </div>

      <div className={styles.progressBarContainer} style={{ position: 'relative' }}>
        {!isReady && <div aria-hidden className={styles.waveformShimmer} />}

        <div className={styles.waveform} ref={waveformRef} />

        {isBuffering && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <FaSpinner className={styles.spin} />
          </div>
        )}

        <button
          className={`${styles.listenAlongButton} ${styles.listenAlongFloat}`}
          onClick={togglePlay}
          style={{ position: 'absolute', top: 8, right: 8 }}
          type="button"
        >
          <FaHeadphones />
          <span>Listen Along</span>
        </button>
      </div>

      <div className={styles.timeInfo}>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
});

export default WaveformPlayer;
