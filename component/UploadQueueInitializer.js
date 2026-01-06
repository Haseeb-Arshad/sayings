// Upload Queue Initializer
// Initializes the upload queue on app startup and handles auto-retry

'use client';

import { useEffect } from 'react';
import uploadQueue from '../services/UploadQueue.js';

export default function UploadQueueInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mounted = true;

    const initializeQueue = async () => {
      try {
        await uploadQueue.initialize();
        
        if (mounted) {
          console.log('Upload queue initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize upload queue:', error);
      }
    };

    initializeQueue();

    return () => {
      mounted = false;
      uploadQueue.stopPeriodicChecks();
    };
  }, []);

  return null;
}
