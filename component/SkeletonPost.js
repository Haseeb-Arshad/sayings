// components/SkeletonPost.jsx

'use client';

import React from 'react';
import styles from '../styles/Skeleton.module.css';
import { motion } from 'framer-motion';

const SkeletonPost = () => {
  return (
    <motion.div
      className={styles.skeletonContainer}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, repeatType: 'mirror', duration: 1 }}
    >
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonAvatar}></div>
        <div className={styles.skeletonInfo}>
          <div className={styles.skeletonLine}></div>
          <div className={styles.skeletonLineShort}></div>
        </div>
      </div>
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonLine}></div>
        <div className={styles.skeletonLine}></div>
        <div className={styles.skeletonLine}></div>
      </div>
      <div className={styles.skeletonFooter}>
        <div className={styles.skeletonButton}></div>
        <div className={styles.skeletonButton}></div>
        <div className={styles.skeletonButton}></div>
      </div>
    </motion.div>
  );
};

export default SkeletonPost;
