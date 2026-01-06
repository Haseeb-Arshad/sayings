// Upload Queue service for managing failed uploads
// Persists uploads to IndexedDB and handles retries with exponential backoff

import axios from '../utils/axiosInstance.js';
import analyticsService from './AnalyticsService.js';
import recordingService from './RecordingService.js';
import { calculateBackoffDelay, formatDelay } from '../utils/exponentialBackoff.js';
import {
  initDB,
  addToQueue,
  getAllFromQueue,
  getQueueItem,
  updateQueueItem,
  removeFromQueue,
  getQueueCount
} from '../utils/indexedDB.js';

const MAX_RETRY_ATTEMPTS = 5;
const PERIODIC_CHECK_INTERVAL = 30000; // 30 seconds
const MAX_CONCURRENT_UPLOADS = 2;

class UploadQueue {
  constructor() {
    this.isProcessing = false;
    this.listeners = [];
    this.periodicCheckTimer = null;
    this.initialized = false;
  }

  /**
   * Initialize the upload queue
   * Runs on app startup to process any pending uploads
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await initDB();
      this.initialized = true;

      // Process pending uploads on startup
      await this.processQueue();

      // Start periodic checks
      this.startPeriodicChecks();

      console.log('Upload queue initialized');
    } catch (error) {
      console.error('Failed to initialize upload queue:', error);
    }
  }

  /**
   * Start periodic checks for pending uploads
   */
  startPeriodicChecks() {
    if (this.periodicCheckTimer) {
      clearInterval(this.periodicCheckTimer);
    }

    this.periodicCheckTimer = setInterval(() => {
      if (!this.isProcessing && navigator.onLine) {
        this.processQueue();
      }
    }, PERIODIC_CHECK_INTERVAL);
  }

  /**
   * Stop periodic checks
   */
  stopPeriodicChecks() {
    if (this.periodicCheckTimer) {
      clearInterval(this.periodicCheckTimer);
      this.periodicCheckTimer = null;
    }
  }

  /**
   * Add upload to queue
   * @param {Blob} blob - Audio blob
   * @param {Object} metadata - Upload metadata
   * @returns {Promise<number>} Queue item ID
   */
  async addToUploadQueue(blob, metadata = {}) {
    try {
      // Convert blob to base64 for storage
      const base64Data = await this._blobToBase64(blob);

      const queueItem = {
        blob: base64Data,
        blobType: blob.type,
        blobSize: blob.size,
        metadata,
        timestamp: Date.now(),
        retryCount: 0,
        errorType: null,
        errorMessage: null,
        lastRetryAt: null,
        nextRetryAt: Date.now(), // Try immediately
        duration: metadata.duration || 0
      };

      const id = await addToQueue(queueItem);

      analyticsService.logQueueAdded({
        id,
        blobSize: blob.size,
        metadata
      });

      // Notify listeners
      this._notifyListeners('added', { id, ...queueItem });

      return id;
    } catch (error) {
      console.error('Failed to add to upload queue:', error);
      throw error;
    }
  }

  /**
   * Process upload queue
   * Attempts to upload all pending items with retry logic
   */
  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    if (!navigator.onLine) {
      console.log('Cannot process queue: offline');
      return;
    }

    this.isProcessing = true;
    this._notifyListeners('processing', { started: true });

    try {
      const items = await getAllFromQueue();
      const now = Date.now();

      // Filter items ready for retry
      const readyItems = items.filter(item => item.nextRetryAt <= now);

      if (readyItems.length === 0) {
        return;
      }

      console.log(`Processing ${readyItems.length} uploads from queue`);

      let succeeded = 0;
      let failed = 0;

      // Process items with concurrency limit
      for (let i = 0; i < readyItems.length; i += MAX_CONCURRENT_UPLOADS) {
        const batch = readyItems.slice(i, i + MAX_CONCURRENT_UPLOADS);
        const results = await Promise.allSettled(
          batch.map(item => this._processQueueItem(item))
        );

        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value === true) {
            succeeded++;
          } else {
            failed++;
          }
        });
      }

      analyticsService.logQueueProcessed(readyItems.length, succeeded, failed);

      console.log(`Queue processing complete: ${succeeded} succeeded, ${failed} failed`);

      this._notifyListeners('processed', { succeeded, failed });
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
      this._notifyListeners('processing', { started: false });
    }
  }

  /**
   * Process a single queue item
   * @private
   */
  async _processQueueItem(item) {
    const { id, blob, blobType, metadata, retryCount } = item;

    try {
      // Convert base64 back to blob
      const audioBlob = await this._base64ToBlob(blob, blobType);

      // Notify listeners of retry attempt
      this._notifyListeners('retrying', { 
        id, 
        attempt: retryCount + 1,
        maxAttempts: MAX_RETRY_ATTEMPTS 
      });

      // Attempt upload
      const result = await this._uploadAudio(audioBlob, metadata);

      // Success - remove from queue
      await removeFromQueue(id);

      analyticsService.logUploadSuccess({
        id,
        retryCount,
        blobSize: audioBlob.size
      });

      this._notifyListeners('success', { id, result });

      return true;
    } catch (error) {
      const categorized = recordingService.categorizeError(error);
      const newRetryCount = retryCount + 1;

      analyticsService.logUploadRetry(newRetryCount, null, {
        id,
        errorType: categorized.type,
        errorMessage: categorized.message
      });

      // Check if we should retry
      if (newRetryCount >= MAX_RETRY_ATTEMPTS || !categorized.isRetryable) {
        // Permanent failure
        analyticsService.logUploadFailedPermanent(
          categorized.type,
          newRetryCount,
          { id }
        );

        // Remove from queue (or could keep with a 'failed' flag)
        await removeFromQueue(id);

        this._notifyListeners('failed', { 
          id, 
          error: categorized,
          permanent: true 
        });

        return false;
      }

      // Calculate backoff and schedule retry
      const delay = calculateBackoffDelay(newRetryCount - 1);
      const nextRetryAt = Date.now() + delay;

      const updatedItem = {
        ...item,
        retryCount: newRetryCount,
        errorType: categorized.type,
        errorMessage: categorized.message,
        lastRetryAt: Date.now(),
        nextRetryAt
      };

      await updateQueueItem(updatedItem);

      this._notifyListeners('failed', { 
        id, 
        error: categorized,
        permanent: false,
        retryCount: newRetryCount,
        nextRetryAt,
        retryDelay: formatDelay(delay)
      });

      return false;
    }
  }

  /**
   * Upload audio with error handling
   * @private
   */
  async _uploadAudio(blob, metadata) {
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    
    // Add metadata
    if (metadata.title) {
      formData.append('title', metadata.title);
    }
    if (metadata.transcript) {
      formData.append('transcript', metadata.transcript);
    }
    if (metadata.topics) {
      formData.append('topics', JSON.stringify(metadata.topics));
    }
    if (metadata.privacy) {
      formData.append('privacy', metadata.privacy);
    }

    try {
      const endpoint = metadata.endpoint || '/posts';
      const response = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 // 60 second timeout for uploads
      });

      return response.data;
    } catch (error) {
      const categorized = recordingService.categorizeError(error);
      
      analyticsService.logUploadError(
        categorized.type,
        categorized.originalMessage,
        {
          blobSize: blob.size,
          endpoint: metadata.endpoint || '/posts'
        }
      );

      throw error;
    }
  }

  /**
   * Get queue status
   * @returns {Promise<Object>}
   */
  async getQueueStatus() {
    try {
      const items = await getAllFromQueue();
      const now = Date.now();

      return {
        total: items.length,
        pending: items.filter(item => item.nextRetryAt <= now).length,
        waiting: items.filter(item => item.nextRetryAt > now).length,
        isProcessing: this.isProcessing,
        items: items.map(item => ({
          id: item.id,
          timestamp: item.timestamp,
          retryCount: item.retryCount,
          errorType: item.errorType,
          nextRetryAt: item.nextRetryAt,
          size: item.blobSize
        }))
      };
    } catch (error) {
      console.error('Failed to get queue status:', error);
      return {
        total: 0,
        pending: 0,
        waiting: 0,
        isProcessing: false,
        items: []
      };
    }
  }

  /**
   * Clear entire queue
   */
  async clearQueue() {
    try {
      const items = await getAllFromQueue();
      for (const item of items) {
        await removeFromQueue(item.id);
      }
      this._notifyListeners('cleared', {});
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }

  /**
   * Remove specific item from queue
   */
  async removeItem(id) {
    try {
      await removeFromQueue(id);
      this._notifyListeners('removed', { id });
    } catch (error) {
      console.error('Failed to remove item from queue:', error);
    }
  }

  /**
   * Add event listener
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove event listener
   * @param {Function} callback - Callback function
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Notify all listeners
   * @private
   */
  _notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }

  /**
   * Convert blob to base64
   * @private
   */
  _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert base64 to blob
   * @private
   */
  async _base64ToBlob(base64, type) {
    const response = await fetch(base64);
    return response.blob();
  }
}

// Export singleton instance
const uploadQueue = new UploadQueue();
export default uploadQueue;
