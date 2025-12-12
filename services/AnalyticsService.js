// Analytics service for tracking events
// Logs upload failures, retry attempts, and other important events

const EVENT_TYPES = {
  RECORDING_ERROR: 'recording_error',
  UPLOAD_ERROR: 'upload_error',
  UPLOAD_RETRY: 'upload_retry',
  UPLOAD_SUCCESS: 'upload_success',
  UPLOAD_FAILED_PERMANENT: 'upload_failed_permanent',
  PERMISSION_DENIED: 'permission_denied',
  QUEUE_ADDED: 'queue_added',
  QUEUE_PROCESSED: 'queue_processed',
};

class AnalyticsService {
  constructor() {
    this.events = [];
    this.maxEvents = 1000; // Keep last 1000 events in memory
    this.debug = process.env.NODE_ENV === 'development';
  }

  /**
   * Log an event
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  logEvent(eventType, data = {}) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      }
    };

    // Add to in-memory store
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to console in development
    if (this.debug) {
      console.log(`[Analytics] ${eventType}:`, data);
    }

    // In production, you would send this to an analytics service
    // For now, we'll store it locally and potentially batch send
    this._persistEvent(event);
  }

  /**
   * Log recording error
   * @param {string} errorType - Error category
   * @param {string} errorMessage - Error message
   * @param {Object} metadata - Additional metadata
   */
  logRecordingError(errorType, errorMessage, metadata = {}) {
    this.logEvent(EVENT_TYPES.RECORDING_ERROR, {
      errorType,
      errorMessage,
      ...metadata
    });
  }

  /**
   * Log upload error
   * @param {string} errorType - Error category
   * @param {string} errorMessage - Error message
   * @param {Object} metadata - Additional metadata
   */
  logUploadError(errorType, errorMessage, metadata = {}) {
    this.logEvent(EVENT_TYPES.UPLOAD_ERROR, {
      errorType,
      errorMessage,
      ...metadata
    });
  }

  /**
   * Log upload retry attempt
   * @param {number} attempt - Retry attempt number
   * @param {number} delay - Delay before retry
   * @param {Object} metadata - Additional metadata
   */
  logUploadRetry(attempt, delay, metadata = {}) {
    this.logEvent(EVENT_TYPES.UPLOAD_RETRY, {
      attempt,
      delay,
      ...metadata
    });
  }

  /**
   * Log successful upload
   * @param {Object} metadata - Additional metadata
   */
  logUploadSuccess(metadata = {}) {
    this.logEvent(EVENT_TYPES.UPLOAD_SUCCESS, metadata);
  }

  /**
   * Log permanent upload failure (after all retries)
   * @param {string} errorType - Error category
   * @param {number} retryCount - Number of retry attempts
   * @param {Object} metadata - Additional metadata
   */
  logUploadFailedPermanent(errorType, retryCount, metadata = {}) {
    this.logEvent(EVENT_TYPES.UPLOAD_FAILED_PERMANENT, {
      errorType,
      retryCount,
      ...metadata
    });
  }

  /**
   * Log permission denied error
   * @param {string} permission - Type of permission denied
   * @param {Object} metadata - Additional metadata
   */
  logPermissionDenied(permission, metadata = {}) {
    this.logEvent(EVENT_TYPES.PERMISSION_DENIED, {
      permission,
      ...metadata
    });
  }

  /**
   * Log item added to queue
   * @param {Object} metadata - Additional metadata
   */
  logQueueAdded(metadata = {}) {
    this.logEvent(EVENT_TYPES.QUEUE_ADDED, metadata);
  }

  /**
   * Log queue processing
   * @param {number} itemsProcessed - Number of items processed
   * @param {number} itemsSucceeded - Number of items that succeeded
   * @param {number} itemsFailed - Number of items that failed
   */
  logQueueProcessed(itemsProcessed, itemsSucceeded, itemsFailed) {
    this.logEvent(EVENT_TYPES.QUEUE_PROCESSED, {
      itemsProcessed,
      itemsSucceeded,
      itemsFailed
    });
  }

  /**
   * Get recent events
   * @param {number} count - Number of events to retrieve
   * @returns {Array} Recent events
   */
  getRecentEvents(count = 100) {
    return this.events.slice(-count);
  }

  /**
   * Get events by type
   * @param {string} eventType - Event type to filter by
   * @returns {Array} Filtered events
   */
  getEventsByType(eventType) {
    return this.events.filter(e => e.type === eventType);
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const errors = this.events.filter(e => 
      e.type === EVENT_TYPES.RECORDING_ERROR || 
      e.type === EVENT_TYPES.UPLOAD_ERROR
    );

    const errorsByType = {};
    errors.forEach(e => {
      const type = e.data.errorType || 'unknown';
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    return {
      totalErrors: errors.length,
      errorsByType,
      recentErrors: errors.slice(-10)
    };
  }

  /**
   * Persist event to localStorage (for offline capability)
   * @private
   */
  _persistEvent(event) {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const key = 'analytics_events';
      const stored = localStorage.getItem(key);
      const events = stored ? JSON.parse(stored) : [];
      
      events.push(event);
      
      // Keep only last 100 events in localStorage
      if (events.length > 100) {
        events.shift();
      }
      
      localStorage.setItem(key, JSON.stringify(events));
    } catch (err) {
      // Ignore localStorage errors (quota exceeded, etc.)
      console.warn('Failed to persist analytics event:', err);
    }
  }

  /**
   * Clear all events
   */
  clearEvents() {
    this.events = [];
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('analytics_events');
      } catch (err) {
        // Ignore
      }
    }
  }
}

// Export singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;

export { EVENT_TYPES };
