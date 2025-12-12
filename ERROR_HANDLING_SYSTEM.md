# Audio Recording Error Handling & Retry System

## Overview

This document describes the robust error handling and retry system implemented for the audio recorder's upload flow. The system provides granular error boundaries, exponential backoff retry logic, persistent storage for failed uploads, and comprehensive analytics logging.

## Architecture

### Core Components

#### 1. Services (`/services`)

**RecordingService.js**
- Error categorization (network, server, timeout, permission, unsupported, quota, encoding)
- MediaRecorder API utilities
- Browser capability detection
- Blob validation

**UploadQueue.js**
- IndexedDB-based persistent queue
- Exponential backoff retry logic (1s → 2s → 4s → 8s max)
- Auto-retry on app startup
- Periodic retry checks (every 30 seconds)
- Concurrent upload management

**AnalyticsService.js**
- Event logging for all error types
- Retry attempt tracking
- Success/failure metrics
- In-memory event storage with localStorage persistence

#### 2. Utilities (`/utils`)

**exponentialBackoff.js**
- Calculates retry delays: 1s → 2s → 4s → 8s (max)
- Human-readable delay formatting
- Configurable min/max delays

**indexedDB.js**
- Database initialization
- CRUD operations for upload queue
- Schema management for failed uploads

#### 3. UI Components (`/component`)

**RecordingError.js**
- Full-screen error notifications
- Inline error displays
- User-friendly error messages
- Recovery action suggestions

**UploadQueueStatus.js**
- Real-time queue status display
- Expandable item list
- Manual retry trigger
- Queue management actions

**UploadQueueInitializer.js**
- Initializes queue on app startup
- Processes pending uploads
- Starts periodic checks

## Error Categories

### Network Errors
- **Trigger**: Lost connection, offline status
- **Message**: "Network connection issue. Please check your internet connection."
- **Action**: Check connection and try again
- **Retryable**: Yes

### Server Errors
- **Trigger**: HTTP 5xx responses
- **Message**: "Server error. Please try again later."
- **Action**: Wait a few moments and try again
- **Retryable**: Yes

### Timeout Errors
- **Trigger**: Request exceeds timeout limit
- **Message**: "Request timed out. Please try again."
- **Action**: Try recording a shorter audio clip
- **Retryable**: Yes

### Permission Errors
- **Trigger**: Microphone access denied
- **Message**: "Microphone permission denied. Please allow microphone access to record audio."
- **Action**: Go to browser settings and enable microphone permissions
- **Retryable**: No

### Unsupported Errors
- **Trigger**: MediaRecorder not available
- **Message**: "Audio recording is not supported in your browser."
- **Action**: Update browser or use a different one
- **Retryable**: No

### Quota Errors
- **Trigger**: Storage limit exceeded
- **Message**: "Storage quota exceeded. Please free up some space."
- **Action**: Clear browser data or use a different device
- **Retryable**: No

### Encoding Errors
- **Trigger**: Audio encoding failure
- **Message**: "Audio encoding failed. Please try recording again."
- **Action**: Try recording again with a different format
- **Retryable**: No

## Retry Logic

### Exponential Backoff

Retry delays follow exponential backoff pattern:
- Attempt 1: 1 second
- Attempt 2: 2 seconds
- Attempt 3: 4 seconds
- Attempt 4: 8 seconds (max)
- Attempt 5+: 8 seconds (max)

Maximum retry attempts: 5

### Auto-Retry Triggers

1. **App Startup**: Processes all pending uploads from IndexedDB
2. **Periodic Checks**: Every 30 seconds while app is active
3. **Manual Trigger**: User can manually retry from queue status UI

### Queue Persistence

Failed uploads are stored in IndexedDB with:
- Audio blob (base64 encoded)
- Metadata (title, transcript, topics, privacy)
- Error information (type, message)
- Retry tracking (count, last attempt, next retry time)
- Upload configuration (endpoint, duration)

## Usage Examples

### Recording with Error Handling

```javascript
import recordingService from '../services/RecordingService.js';
import uploadQueue from '../services/UploadQueue.js';
import analyticsService from '../services/AnalyticsService.js';

// Check if recording is supported
if (!recordingService.isSupported()) {
  const error = recordingService.categorizeError(
    new Error('MediaRecorder not supported')
  );
  console.error(error.message);
  return;
}

// Request microphone permission
try {
  const stream = await recordingService.requestMicrophonePermission();
  const mediaRecorder = recordingService.createMediaRecorder(stream);
  // ... recording logic
} catch (err) {
  const categorized = err.categorized || recordingService.categorizeError(err);
  console.error(categorized.message);
  // Show error to user
}
```

### Upload with Retry

```javascript
// Upload with automatic retry
try {
  const response = await axios.post('/transcribe', formData, {
    timeout: 60000
  });
  
  analyticsService.logUploadSuccess({
    duration,
    size: blob.size,
    retryCount: attempt
  });
  
  return response.data;
} catch (error) {
  const categorized = recordingService.categorizeError(error);
  
  if (categorized.isRetryable && attempt < MAX_RETRIES) {
    // Retry with backoff
    const delay = calculateBackoffDelay(attempt);
    setTimeout(() => retry(), delay);
  } else {
    // Add to persistent queue
    await uploadQueue.addToUploadQueue(blob, metadata);
  }
}
```

### Initialize Queue on Startup

```javascript
// In your root layout or app component
import UploadQueueInitializer from '@/component/UploadQueueInitializer';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <UploadQueueInitializer />
        {children}
      </body>
    </html>
  );
}
```

## Analytics Events

The system logs the following events:

- `recording_error`: Recording failures
- `upload_error`: Upload failures with error type
- `upload_retry`: Retry attempts with delay
- `upload_success`: Successful uploads
- `upload_failed_permanent`: Permanent failures after all retries
- `permission_denied`: Permission denials
- `queue_added`: Items added to queue
- `queue_processed`: Batch processing results

### Accessing Analytics

```javascript
import analyticsService from '../services/AnalyticsService.js';

// Get error statistics
const stats = analyticsService.getErrorStats();
console.log(`Total errors: ${stats.totalErrors}`);
console.log('Errors by type:', stats.errorsByType);

// Get recent events
const recentEvents = analyticsService.getRecentEvents(50);

// Get events by type
const uploadErrors = analyticsService.getEventsByType('upload_error');
```

## Testing

### Manual Testing Scenarios

1. **Offline Upload**: Disable network and attempt upload
2. **Permission Denial**: Block microphone access
3. **Server Error**: Mock 5xx response
4. **Timeout**: Upload large file with short timeout
5. **Queue Recovery**: Create failed uploads, refresh page, verify auto-retry

### Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 14.5+)
- **Opera**: Full support

## Configuration

### Customizing Retry Behavior

```javascript
// In UploadQueue.js
const MAX_RETRY_ATTEMPTS = 5; // Change max retries
const PERIODIC_CHECK_INTERVAL = 30000; // Change check interval (ms)
const MAX_CONCURRENT_UPLOADS = 2; // Change concurrent uploads
```

### Customizing Backoff Delays

```javascript
// In exponentialBackoff.js
const MIN_DELAY = 1000; // 1 second
const MAX_DELAY = 8000; // 8 seconds
```

## Future Enhancements

1. **Remote Analytics**: Send events to analytics service (GA, Mixpanel, etc.)
2. **Network Change Detection**: Retry immediately on network restoration
3. **Upload Progress**: Show real-time upload progress
4. **Compression**: Compress audio before upload
5. **Chunked Uploads**: Support large file uploads via chunking
6. **Background Sync**: Use Service Worker Background Sync API

## Troubleshooting

### Queue Not Processing
- Check browser console for errors
- Verify IndexedDB is enabled
- Ensure navigator.onLine returns true

### Excessive Retries
- Check network stability
- Verify server is responding
- Review error logs in analytics

### Memory Issues
- Clear old analytics events
- Limit queue size
- Check blob storage

## API Reference

See individual service files for detailed API documentation:
- [RecordingService.js](./services/RecordingService.js)
- [UploadQueue.js](./services/UploadQueue.js)
- [AnalyticsService.js](./services/AnalyticsService.js)
