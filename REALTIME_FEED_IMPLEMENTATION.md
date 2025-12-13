# Real-Time Feed Updates Implementation

## Overview
This implementation adds real-time feed updates to the Sayings app, allowing users to see new posts, likes, and comments without manual refresh. The system uses WebSocket connections with automatic fallback to polling for maximum reliability.

## Features Implemented

### ✅ Core Features
- **WebSocket Real-Time Updates**: Primary method for instant feed updates
- **Polling Fallback**: Automatic 30-second polling if WebSocket unavailable
- **New Posts Badge**: Shows "X new posts available" at the top of feed
- **Click-to-Reveal**: Click badge to scroll up and show new content
- **Auto-Load on Scroll**: New posts load automatically when scrolling to top
- **Real-Time Interactions**: Likes and comments update in real-time across all clients
- **Connection Status Indicator**: Shows "Live" or "Auto-refresh" status

### ✅ Optimization Features
- **Page Visibility Detection**: Pauses polling when tab is hidden (saves bandwidth)
- **Offline Detection**: Stops updates when offline, resumes when back online
- **Smart Badge Management**: Badge clears automatically on scroll to top
- **Duplicate Prevention**: Ensures no duplicate posts are added
- **Resource Cleanup**: Proper cleanup on component unmount

## Architecture

### Frontend Components

#### 1. **usePageVisibility Hook** (`hooks/usePageVisibility.js`)
Detects when the browser tab is hidden or visible.
```javascript
const isVisible = usePageVisibility();
```

#### 2. **useRealtimeFeed Hook** (`hooks/useRealtimeFeed.js`)
Main hook managing WebSocket connection and polling fallback.
```javascript
const { isConnected, connectionType, forceCheck } = useRealtimeFeed({
  posts,
  onNewPosts: handleNewPosts,
  onPostUpdate: handlePostUpdate,
  filter,
  enabled: true
});
```

**Features:**
- Attempts WebSocket connection first
- Falls back to polling after 5-second timeout
- Pauses polling when tab is hidden
- Handles online/offline events
- Emits events for new posts and post updates

#### 3. **Home Page Updates** (`app/page.js`)
Integrated real-time updates into the main feed.

**Key Changes:**
- Added `newPostsCount` state for badge counter
- Implemented `handleNewPosts` callback for new post handling
- Implemented `handlePostUpdate` callback for like/comment updates
- Auto-loads new posts when user scrolls to top
- Shows connection status indicator

### Backend Components

#### 1. **WebSocket Server** (`sayings-backend/index.js`)
Socket.IO server with authentication and room management.

**Features:**
- JWT authentication for WebSocket connections
- Room-based subscriptions (feed:recent, feed:topic:*)
- Connection/disconnection logging
- Broadcasts new posts to subscribed rooms

#### 2. **Posts Controller Updates** (`sayings-backend/controllers/postsController.js`)
Emits WebSocket events for all post interactions.

**Updated Functions:**
- `createPost`: Emits `feed:new-posts` event to relevant rooms
- `likePost`: Emits `post:update` event for real-time like counts
- `addComment`: Emits `post:update` event for real-time comment counts
- `getPosts`: Supports `since` parameter for polling

## API Endpoints

### Polling Endpoint
```
GET /api/posts?since=<timestamp>&filter=<filter>&page=1&limit=10
```
Returns posts newer than the provided timestamp.

## WebSocket Events

### Client → Server
- `subscribe:feed` - Subscribe to feed updates
  ```javascript
  socket.emit('subscribe:feed', { filter: 'recent' });
  ```

### Server → Client
- `feed:new-posts` - New posts available
  ```javascript
  socket.on('feed:new-posts', (data) => {
    // data.posts contains new posts
  });
  ```

- `post:update` - Post updated (like, comment)
  ```javascript
  socket.on('post:update', (data) => {
    // data.post contains updated post
  });
  ```

## User Experience

### Visual Feedback
1. **Connection Status Indicator** (top-right corner)
   - Green pulsing dot
   - Shows "Live" for WebSocket or "Auto-refresh" for polling
   - Only visible when connected

2. **New Posts Badge** (top-center)
   - Appears when new posts are available
   - Shows count: "X new posts available. Click to view."
   - Smooth fade-in/out animation
   - Clickable to scroll to top

3. **Auto-Load Behavior**
   - If user is at top: New posts prepend immediately
   - If user is scrolled down: Badge appears
   - Scrolling to top: Auto-loads new posts

### Performance Optimizations
- Polling pauses when tab is hidden
- Polling stops when offline
- WebSocket preferred over polling (lower overhead)
- Debounced filter changes
- Request deduplication

## Configuration

### WebSocket URL
Set via environment variable:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```
WebSocket will automatically use `ws://` or `wss://` protocol.

### Polling Interval
Default: 30 seconds (configured in `useRealtimeFeed.js`)

### WebSocket Fallback Timeout
Default: 5 seconds before falling back to polling

## Dependencies Added

### Frontend
- `socket.io-client` - WebSocket client library

### Backend
- `socket.io` - WebSocket server library

## Browser Support
- WebSocket: All modern browsers (fallback to polling for older browsers)
- Page Visibility API: All modern browsers
- Works on mobile devices

## Security
- WebSocket connections require JWT authentication
- Token validation on connection
- Room-based access control
- Same-origin policy enforced

## Testing Checklist
- [x] New posts appear in real-time
- [x] Badge shows correct count
- [x] Click badge scrolls to top and reveals posts
- [x] Scrolling to top auto-loads new posts
- [x] Polling pauses when tab hidden
- [x] Updates stop when offline
- [x] Updates resume when back online
- [x] Likes update in real-time
- [x] Comments update in real-time
- [x] WebSocket fallback to polling works
- [x] Connection status indicator shows correct state
- [x] No duplicate posts appear

## Future Enhancements
- [ ] Typing indicators for comments
- [ ] Online user presence
- [ ] Notification for mentions
- [ ] Audio notification for new posts
- [ ] Push notifications via service worker
- [ ] Optimistic UI updates
- [ ] Reconnection with exponential backoff
- [ ] Connection quality indicator

## Troubleshooting

### WebSocket Not Connecting
1. Check backend is running with WebSocket support
2. Verify JWT token is valid
3. Check CORS settings allow WebSocket connections
4. System will automatically fallback to polling

### Polling Not Working
1. Check `/api/posts` endpoint is accessible
2. Verify `since` parameter is supported
3. Check browser console for errors

### Posts Not Updating
1. Verify connection status indicator is visible
2. Check tab is not hidden (should pause updates)
3. Check network connection
4. Verify backend is emitting WebSocket events

## Code Style
- Follows existing React patterns
- Uses React Hooks exclusively
- Proper cleanup in useEffect
- TypeScript-ready (JSDoc comments)
- Consistent with app conventions
