// Recording service with error categorization
// Handles MediaRecorder operations with proper error handling

import analyticsService from './AnalyticsService.js';

// Error categories
export const ErrorType = {
  NETWORK: 'network',
  SERVER: 'server',
  TIMEOUT: 'timeout',
  PERMISSION: 'permission',
  UNSUPPORTED: 'unsupported',
  QUOTA: 'quota',
  ENCODING: 'encoding',
  UNKNOWN: 'unknown'
};

// User-friendly error messages
const ERROR_MESSAGES = {
  [ErrorType.NETWORK]: 'Network connection issue. Please check your internet connection.',
  [ErrorType.SERVER]: 'Server error. Please try again later.',
  [ErrorType.TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorType.PERMISSION]: 'Microphone permission denied. Please allow microphone access to record audio.',
  [ErrorType.UNSUPPORTED]: 'Audio recording is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Safari.',
  [ErrorType.QUOTA]: 'Storage quota exceeded. Please free up some space.',
  [ErrorType.ENCODING]: 'Audio encoding failed. Please try recording again.',
  [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.'
};

// Recovery actions for each error type
const RECOVERY_ACTIONS = {
  [ErrorType.NETWORK]: 'Check your internet connection and try again.',
  [ErrorType.SERVER]: 'Wait a few moments and try again.',
  [ErrorType.TIMEOUT]: 'Try recording a shorter audio clip.',
  [ErrorType.PERMISSION]: 'Go to browser settings and enable microphone permissions.',
  [ErrorType.UNSUPPORTED]: 'Update your browser or use a different one.',
  [ErrorType.QUOTA]: 'Clear browser data or use a different device.',
  [ErrorType.ENCODING]: 'Try recording again with a different format.',
  [ErrorType.UNKNOWN]: 'Refresh the page and try again.'
};

class RecordingService {
  /**
   * Categorize an error
   * @param {Error} error - Error object
   * @returns {Object} Categorized error with type, message, and recovery action
   */
  categorizeError(error) {
    let errorType = ErrorType.UNKNOWN;
    let originalMessage = error?.message || 'Unknown error';

    // Network errors
    if (
      error?.message?.includes('Network Error') ||
      error?.message?.includes('Failed to fetch') ||
      error?.code === 'ECONNABORTED' ||
      error?.isOffline ||
      !navigator?.onLine
    ) {
      errorType = ErrorType.NETWORK;
    }
    // Timeout errors
    else if (
      error?.message?.includes('timeout') ||
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ECONNABORTED'
    ) {
      errorType = ErrorType.TIMEOUT;
    }
    // Server errors
    else if (
      error?.response?.status >= 500 ||
      error?.message?.includes('Server Error')
    ) {
      errorType = ErrorType.SERVER;
    }
    // Permission errors
    else if (
      error?.name === 'NotAllowedError' ||
      error?.name === 'PermissionDeniedError' ||
      error?.message?.includes('Permission denied') ||
      error?.message?.includes('permission')
    ) {
      errorType = ErrorType.PERMISSION;
    }
    // Unsupported errors
    else if (
      error?.name === 'NotSupportedError' ||
      error?.message?.includes('not supported') ||
      error?.message?.includes('MediaRecorder')
    ) {
      errorType = ErrorType.UNSUPPORTED;
    }
    // Quota errors
    else if (
      error?.name === 'QuotaExceededError' ||
      error?.message?.includes('quota') ||
      error?.message?.includes('storage')
    ) {
      errorType = ErrorType.QUOTA;
    }
    // Encoding errors
    else if (
      error?.name === 'EncodingError' ||
      error?.message?.includes('encoding') ||
      error?.message?.includes('codec')
    ) {
      errorType = ErrorType.ENCODING;
    }
    // Client errors (4xx except 401, 403)
    else if (error?.response?.status >= 400 && error?.response?.status < 500) {
      errorType = ErrorType.SERVER;
    }

    const userMessage = ERROR_MESSAGES[errorType];
    const recoveryAction = RECOVERY_ACTIONS[errorType];

    // Log to analytics
    analyticsService.logRecordingError(errorType, originalMessage, {
      statusCode: error?.response?.status,
      errorName: error?.name
    });

    return {
      type: errorType,
      message: userMessage,
      originalMessage,
      recoveryAction,
      isRetryable: this.isRetryable(errorType)
    };
  }

  /**
   * Check if an error type is retryable
   * @param {string} errorType - Error type
   * @returns {boolean}
   */
  isRetryable(errorType) {
    return [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.SERVER
    ].includes(errorType);
  }

  /**
   * Check if MediaRecorder is supported
   * @returns {boolean}
   */
  isSupported() {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      !!navigator.mediaDevices.getUserMedia &&
      !!window.MediaRecorder
    );
  }

  /**
   * Get supported MIME types
   * @returns {Array<string>}
   */
  getSupportedMimeTypes() {
    if (!this.isSupported()) {
      return [];
    }

    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];

    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }

  /**
   * Get best MIME type
   * @returns {string}
   */
  getBestMimeType() {
    const supported = this.getSupportedMimeTypes();
    if (supported.length === 0) {
      return 'audio/webm'; // Fallback
    }
    // Prefer opus codec for better quality and compression
    const opus = supported.find(t => t.includes('opus'));
    return opus || supported[0];
  }

  /**
   * Request microphone permission
   * @returns {Promise<MediaStream>}
   */
  async requestMicrophonePermission() {
    try {
      if (!this.isSupported()) {
        throw new Error('MediaRecorder not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      return stream;
    } catch (error) {
      const categorized = this.categorizeError(error);
      
      if (categorized.type === ErrorType.PERMISSION) {
        analyticsService.logPermissionDenied('microphone', {
          errorName: error.name,
          errorMessage: error.message
        });
      }

      throw {
        ...error,
        categorized
      };
    }
  }

  /**
   * Create MediaRecorder instance
   * @param {MediaStream} stream - Media stream
   * @returns {MediaRecorder}
   */
  createMediaRecorder(stream) {
    try {
      const mimeType = this.getBestMimeType();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000 // 128kbps
      });

      return mediaRecorder;
    } catch (error) {
      const categorized = this.categorizeError(error);
      analyticsService.logRecordingError(
        categorized.type,
        categorized.originalMessage,
        { mimeType: this.getBestMimeType() }
      );
      throw {
        ...error,
        categorized
      };
    }
  }

  /**
   * Stop media stream tracks
   * @param {MediaStream} stream - Media stream to stop
   */
  stopStream(stream) {
    if (!stream) return;

    try {
      stream.getTracks().forEach(track => {
        track.stop();
      });
    } catch (error) {
      console.warn('Error stopping media stream:', error);
    }
  }

  /**
   * Create blob from chunks
   * @param {Array<Blob>} chunks - Audio chunks
   * @param {string} mimeType - MIME type
   * @returns {Blob}
   */
  createBlob(chunks, mimeType) {
    try {
      return new Blob(chunks, { type: mimeType });
    } catch (error) {
      const categorized = this.categorizeError(error);
      analyticsService.logRecordingError(
        categorized.type,
        categorized.originalMessage,
        { mimeType, chunkCount: chunks.length }
      );
      throw {
        ...error,
        categorized
      };
    }
  }

  /**
   * Validate blob
   * @param {Blob} blob - Audio blob
   * @returns {boolean}
   */
  validateBlob(blob) {
    if (!blob || blob.size === 0) {
      return false;
    }

    // Check minimum size (at least 1KB)
    if (blob.size < 1024) {
      return false;
    }

    // Check maximum size (50MB)
    if (blob.size > 50 * 1024 * 1024) {
      return false;
    }

    return true;
  }

  /**
   * Get blob metadata
   * @param {Blob} blob - Audio blob
   * @returns {Object}
   */
  getBlobMetadata(blob) {
    return {
      size: blob.size,
      type: blob.type,
      sizeKB: Math.round(blob.size / 1024),
      sizeMB: Math.round((blob.size / 1024 / 1024) * 100) / 100
    };
  }
}

// Export singleton instance
const recordingService = new RecordingService();
export default recordingService;

export { ERROR_MESSAGES, RECOVERY_ACTIONS };
