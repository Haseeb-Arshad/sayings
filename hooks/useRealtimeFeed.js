// hooks/useRealtimeFeed.js

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios, { isNetworkOffline } from '../utils/axiosInstance';
import usePageVisibility from './usePageVisibility';

/**
 * Hook for real-time feed updates using WebSocket with polling fallback
 * 
 * @param {Object} options - Configuration options
 * @param {Array} posts - Current posts array
 * @param {Function} onNewPosts - Callback when new posts are available
 * @param {Function} onPostUpdate - Callback when a post is updated (like, comment, etc.)
 * @param {string} filter - Current filter (recent, topic, etc.)
 * @param {boolean} enabled - Whether the hook is enabled
 */
const useRealtimeFeed = ({ 
  posts = [], 
  onNewPosts, 
  onPostUpdate, 
  filter = 'recent',
  enabled = true 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState(null); // 'websocket' or 'polling'
  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const isVisible = usePageVisibility();
  const isFetchingRef = useRef(false);

  // WebSocket connection URL
  const getWebSocketUrl = useCallback(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    return baseUrl.replace(/^http/, 'ws');
  }, []);

  // Fetch new posts via polling
  const pollNewPosts = useCallback(async () => {
    if (isFetchingRef.current || isNetworkOffline() || !enabled) {
      return;
    }

    isFetchingRef.current = true;

    try {
      const latestTimestamp = posts.length > 0 ? posts[0].timestamp : null;
      
      const response = await axios.get('/posts', {
        params: {
          filter,
          page: 1,
          limit: 10,
          since: latestTimestamp,
        },
        silent: true, // Don't show errors for background polling
      });

      const fetchedPosts = response.data.posts || [];
      
      if (fetchedPosts.length > 0) {
        const existingIds = new Set(posts.map((post) => post._id));
        const uniqueNewPosts = fetchedPosts.filter(
          (post) => !existingIds.has(post._id)
        );

        if (uniqueNewPosts.length > 0 && onNewPosts) {
          onNewPosts(uniqueNewPosts);
        }
      }
    } catch (error) {
      if (!error.isOffline) {
        console.error('Error polling new posts:', error);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [posts, filter, enabled, onNewPosts]);

  // Try to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (socketRef.current || typeof window === 'undefined') {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No auth token, skipping WebSocket connection');
        return;
      }

      const wsUrl = getWebSocketUrl();
      console.log('Attempting WebSocket connection to:', wsUrl);

      const socket = io(wsUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 3,
        timeout: 10000,
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionType('websocket');
        
        // Subscribe to feed updates
        socket.emit('subscribe:feed', { filter });
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.log('WebSocket connection error:', error.message);
        // Will fallback to polling
      });

      // Listen for new posts
      socket.on('feed:new-posts', (data) => {
        console.log('Received new posts via WebSocket:', data);
        if (data.posts && data.posts.length > 0 && onNewPosts) {
          onNewPosts(data.posts);
        }
      });

      // Listen for post updates (likes, comments, etc.)
      socket.on('post:update', (data) => {
        console.log('Received post update via WebSocket:', data);
        if (data.post && onPostUpdate) {
          onPostUpdate(data.post);
        }
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      socketRef.current = null;
    }
  }, [getWebSocketUrl, filter, onNewPosts, onPostUpdate]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('Disconnecting WebSocket');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setConnectionType(null);
    }
  }, []);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current || !enabled) {
      return;
    }

    console.log('Starting polling fallback (30s interval)');
    setConnectionType('polling');
    
    // Poll immediately
    pollNewPosts();
    
    // Then poll every 30 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollNewPosts();
    }, 30000);
  }, [pollNewPosts, enabled]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('Stopping polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setConnectionType(null);
    }
  }, []);

  // Effect: Initialize connection (WebSocket first, fallback to polling)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    // Try WebSocket first
    connectWebSocket();

    // If WebSocket doesn't connect within 5 seconds, fallback to polling
    const fallbackTimer = setTimeout(() => {
      if (!socketRef.current || !isConnected) {
        console.log('WebSocket connection timeout, falling back to polling');
        disconnectWebSocket();
        startPolling();
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimer);
      disconnectWebSocket();
      stopPolling();
    };
  }, [enabled]); // Only run once on mount

  // Effect: Handle page visibility changes
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (isVisible) {
      console.log('Page became visible');
      
      // If we were polling, resume
      if (connectionType === 'polling' && !pollingIntervalRef.current) {
        startPolling();
      }
      
      // If WebSocket was disconnected, try to reconnect
      if (connectionType === 'websocket' && !isConnected && !socketRef.current) {
        connectWebSocket();
      }
      
      // Immediately check for new posts
      pollNewPosts();
    } else {
      console.log('Page became hidden, pausing updates');
      
      // Pause polling when tab is hidden to save bandwidth
      if (connectionType === 'polling') {
        stopPolling();
      }
    }
  }, [isVisible, connectionType, isConnected, enabled]);

  // Effect: Handle online/offline events
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      console.log('Network came online, resuming updates');
      if (connectionType === 'polling') {
        startPolling();
      } else if (connectionType === 'websocket') {
        connectWebSocket();
      }
    };

    const handleOffline = () => {
      console.log('Network went offline, pausing updates');
      stopPolling();
      disconnectWebSocket();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionType, enabled, startPolling, stopPolling, disconnectWebSocket, connectWebSocket]);

  // Effect: Update filter subscription for WebSocket
  useEffect(() => {
    if (socketRef.current && isConnected) {
      console.log('Updating feed filter subscription:', filter);
      socketRef.current.emit('subscribe:feed', { filter });
    }
  }, [filter, isConnected]);

  return {
    isConnected: isConnected || !!pollingIntervalRef.current,
    connectionType,
    forceCheck: pollNewPosts, // Manual trigger for checking new posts
  };
};

export default useRealtimeFeed;
