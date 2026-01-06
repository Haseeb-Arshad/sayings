// components/Providers.jsx

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, createContext, useCallback } from 'react';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ThemeProvider } from '../context/ThemeContext';

// Create a context for refreshing posts
export const RefreshContext = createContext(() => {});

const Providers = ({ children }) => {
  // Initialize QueryClient with optimized settings for infinite scroll
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60000, // 1 minute
        gcTime: 600000, // 10 minutes (increased for better caching)
        retry: 2, // Retry failed requests twice
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        // Network mode for better offline handling
        networkMode: 'online',
      },
      // Global mutation settings
      mutations: {
        networkMode: 'online',
        retry: 1,
      },
    },
  }));

  useEffect(() => {
    // Ensure window is defined (to avoid SSR issues)
    if (typeof window === 'undefined') return;

    // Create a persister using localStorage with optimized settings
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: 'REACT_QUERY_CACHE',
      throttleTime: 2000, // Throttle saving to every 2 seconds
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    });

    // Persist the QueryClient with extended cache time
    persistQueryClient({
      queryClient,
      persister,
      maxAge: 600000, // 10 minutes for better offline experience
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Only cache successful queries with data
          return query.status === 'success' && query.data != null;
        },
      },
    });
  }, [queryClient]);

  // Function to refresh posts by invalidating the 'posts' query
  const refreshPosts = useCallback(() => {
    // Invalidate both infinite query pages and regular queries
    queryClient.invalidateQueries({ 
      queryKey: ['posts'],
      exact: false 
    });
  }, [queryClient]);

  // Function to get cached posts (useful for offline mode)
  const getCachedPosts = useCallback((filter = 'recent') => {
    const queryCache = queryClient.getQueryCache();
    const postsQueries = queryCache.getAll().filter(query => 
      query.queryKey.includes('posts') && 
      query.queryKey.includes(filter)
    );
    
    return postsQueries.map(query => query.state.data).filter(Boolean);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RefreshContext.Provider value={{ 
          refreshPosts, 
          queryClient,
          getCachedPosts 
        }}>
          {children}
        </RefreshContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default Providers;
