'use client';

import React from 'react';
import styles from '../styles/Skeleton.module.css';

const SkeletonPost = () => {
  return (
    <div className={`${styles.skeletonContainer} ${styles.skeletonPulse}`}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonAvatar} />
        <div className={styles.skeletonInfo}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLineShort} />
        </div>
      </div>
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
      </div>
      <div className={styles.skeletonFooter}>
        <div className={styles.skeletonButton} />
        <div className={styles.skeletonButton} />
        <div className={styles.skeletonButton} />
      </div>
    </div>
  );
};

export default SkeletonPost;
