'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import axios from '../utils/axiosInstance';

// Helper function to encode/decode cursor for URL safety
export const encodeCursor = (data) => {
  if (!data) return null;
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

export const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  } catch (error) {
    console.error('Error decoding cursor:', error);
    return null;
  }
};

const fetchPosts = async ({ pageParam = null, filter, limit = 20 }) => {
  const params = {
    filter,
    limit,
  };

  if (pageParam) {
    params.cursor = pageParam;
  }

  const response = await axios.get('/posts', { params });
  return response.data;
};

export default function useInfinitePosts(filter = 'recent', limit = 20) {
  return useInfiniteQuery({
    queryKey: ['posts', filter, limit],
    queryFn: ({ pageParam }) => fetchPosts({ 
      pageParam, 
      filter, 
      limit 
    }),
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor || undefined;
    },
    getPreviousPageParam: (firstPage) => {
      return firstPage.prevCursor || undefined;
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes (renamed from cacheTime in v5)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Enable infinite scroll mode
    initialPageParam: null,
  });
}

// Hook for prefetching next pages
export const usePrefetchPosts = () => {
  const queryClient = useQueryClient();
  
  const prefetchPosts = async (filter, cursor, limit = 20) => {
    const queryKey = ['posts', filter, limit];
    
    // Only prefetch if we have a cursor
    if (cursor) {
      await queryClient.prefetchQuery({
        queryKey: [...queryKey, cursor],
        queryFn: () => fetchPosts({ pageParam: cursor, filter, limit }),
        staleTime: 60000,
        gcTime: 300000,
      });
    }
  };

  return { prefetchPosts };
};