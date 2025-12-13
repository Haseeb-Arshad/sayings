'use client';

import { useEffect } from 'react';
import draftRecordingService from '../services/draftRecordingService';
import { isNetworkOffline } from '../utils/axiosInstance';

/**
 * Hook for background sync of pending drafts when connection returns
 */
export function useBackgroundSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = async () => {
      console.log('Network connection restored, syncing drafts...');
      try {
        const results = await draftRecordingService.syncPendingDrafts();
        console.log('Draft sync results:', results);
      } catch (error) {
        console.error('Error syncing pending drafts:', error);
      }
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);
}

export default useBackgroundSync;
