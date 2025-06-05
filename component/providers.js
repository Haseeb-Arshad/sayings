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
  // Initialize QueryClient with default options
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60000, // 1 minute
        cacheTime: 300000, // 5 minutes
        retry: 2, // Retry failed requests twice
      },
    },
  }));

  useEffect(() => {
    // Ensure window is defined (to avoid SSR issues)
    if (typeof window === 'undefined') return;

    // Create a persister using localStorage
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: 'REACT_QUERY_OFFLINE_CACHE', // Optional: Customize the storage key
      throttleTime: 1000, // Optional: Throttle saving to every 1 second
      serialize: JSON.stringify, // Optional: Customize serialization
      deserialize: JSON.parse, // Optional: Customize deserialization
      retry: undefined, // Optional: Define a retry strategy
    });

    // Persist the QueryClient
    persistQueryClient({
      queryClient,
      persister,
      maxAge: 300000, // 5 minutes
    });
  }, [queryClient]);

  // Function to refresh posts by invalidating the 'posts' query
  const refreshPosts = useCallback(() => {
    queryClient.invalidateQueries(['posts']);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RefreshContext.Provider value={refreshPosts}>
          {children}
        </RefreshContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default Providers;
