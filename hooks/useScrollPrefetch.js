'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefetchPosts } from './useInfinitePosts';

export default function useScrollPrefetch(filter, nextCursor, hasMore) {
  const { prefetchPosts } = usePrefetchPosts();
  const [isFetching, setIsFetching] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollContainerRef = useRef(null);
  const lastPrefetchRef = useRef(null);
  const prefetchThreshold = 0.75; // 75% scroll position
  const debounceDelay = 500; // Debounce prefetch to avoid spam

  // Track scroll position and progress
  const handleScroll = useCallback((e) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    // Calculate scroll progress (0 to 1)
    const progress = (scrollTop + clientHeight) / scrollHeight;
    setScrollProgress(progress);
    
    // Check if we've scrolled past the prefetch threshold
    if (progress >= prefetchThreshold && nextCursor && hasMore && !isFetching) {
      // Only prefetch if we haven't recently prefetched the same cursor
      if (lastPrefetchRef.current !== nextCursor) {
        // Debounce the prefetch call
        const debounceTimer = setTimeout(() => {
          prefetchPosts(filter, nextCursor, 20);
          lastPrefetchRef.current = nextCursor;
          setIsFetching(true);
          
          // Reset fetching state after a short delay
          setTimeout(() => setIsFetching(false), 1000);
        }, debounceDelay);
        
        return () => clearTimeout(debounceTimer);
      }
    }
  }, [filter, nextCursor, hasMore, isFetching, prefetchPosts]);

  // Intersection Observer for detecting when we're near the end
  const createIntersectionObserver = useCallback((container) => {
    if (!container) return null;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && nextCursor && hasMore && !isFetching) {
          // Trigger prefetch when the sentinel element becomes visible
          if (lastPrefetchRef.current !== nextCursor) {
            const debounceTimer = setTimeout(() => {
              prefetchPosts(filter, nextCursor, 20);
              lastPrefetchRef.current = nextCursor;
              setIsFetching(true);
              
              setTimeout(() => setIsFetching(false), 1000);
            }, debounceDelay);
            
            return () => clearTimeout(debounceTimer);
          }
        }
      },
      {
        root: container,
        rootMargin: '100px', // Start loading 100px before reaching the bottom
        threshold: 0.1
      }
    );
    
    return observer;
  }, [filter, nextCursor, hasMore, isFetching, prefetchPosts]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Setup scroll listener and intersection observer
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    
    // Add scroll listener
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Setup intersection observer with a sentinel element
    const observer = createIntersectionObserver(container);
    if (observer) {
      // Create a sentinel element at the bottom
      const sentinel = document.createElement('div');
      sentinel.id = 'scroll-sentinel';
      sentinel.style.height = '1px';
      container.appendChild(sentinel);
      observer.observe(sentinel);
      
      return () => {
        observer.disconnect();
        if (sentinel && sentinel.parentNode) {
          sentinel.parentNode.removeChild(sentinel);
        }
      };
    }
    
    return () => {
      cleanup();
    };
  }, [filter, nextCursor, hasMore, handleScroll, createIntersectionObserver, cleanup]);

  return {
    scrollContainerRef,
    scrollProgress,
    isFetching,
    // Function to manually trigger prefetch if needed
    triggerPrefetch: () => {
      if (nextCursor && hasMore && !isFetching) {
        prefetchPosts(filter, nextCursor, 20);
        setIsFetching(true);
        setTimeout(() => setIsFetching(false), 1000);
      }
    }
  };
}

// Hook for managing scroll position persistence
export function useScrollPersistence(key = 'scroll-position') {
  const saveScrollPosition = useCallback((position) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(position));
    }
  }, [key]);

  const getScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
      } catch (error) {
        console.error('Error reading scroll position:', error);
        return null;
      }
    }
    return null;
  }, [key]);

  const restoreScrollPosition = useCallback((containerRef) => {
    const position = getScrollPosition();
    if (position && containerRef.current) {
      containerRef.current.scrollTop = position.top || 0;
    }
  }, [getScrollPosition]);

  return { saveScrollPosition, getScrollPosition, restoreScrollPosition };
}