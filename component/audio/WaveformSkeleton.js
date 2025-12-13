'use client';

import React from 'react';
import styles from '../../styles/Post.module.css';

export default function WaveformSkeleton() {
  return (
    <div className={styles.audioPlayer} aria-busy="true" aria-live="polite">
      <div className={styles.waveformSkeleton} />
    </div>
  );
}
