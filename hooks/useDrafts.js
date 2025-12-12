'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import draftRecordingService from '../services/draftRecordingService';

/**
 * Hook for managing draft state with React Query
 */
export function useDrafts() {
  const queryClient = useQueryClient();

  // Query: Get all drafts
  const {
    data: drafts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['drafts'],
    queryFn: () => draftRecordingService.list(),
    staleTime: 5000, // 5 seconds
  });

  // Mutation: Create a new draft
  const createDraft = useMutation({
    mutationFn: (draftData) => draftRecordingService.create(draftData.audioBlob, draftData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });

  // Mutation: Update a draft
  const updateDraft = useMutation({
    mutationFn: ({ id, metadata }) => draftRecordingService.update(id, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });

  // Mutation: Delete a draft
  const deleteDraft = useMutation({
    mutationFn: (id) => draftRecordingService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });

  // Mutation: Publish a draft
  const publishDraft = useMutation({
    mutationFn: (id) => draftRecordingService.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Mutation: Sync all pending drafts
  const syncPendingDrafts = useMutation({
    mutationFn: () => draftRecordingService.syncPendingDrafts(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Query: Get statistics
  const {
    data: stats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['drafts-stats'],
    queryFn: () => draftRecordingService.getStats(),
    staleTime: 10000, // 10 seconds
  });

  return {
    // Queries
    drafts,
    isLoading,
    error,
    stats,
    refetch,
    refetchStats,
    
    // Mutations
    createDraft,
    updateDraft,
    deleteDraft,
    publishDraft,
    syncPendingDrafts,

    // Helpers
    savedLocally: drafts.filter(d => d.status === 'saved_locally'),
    uploading: drafts.filter(d => d.status === 'uploading'),
    synced: drafts.filter(d => d.status === 'synced'),
  };
}

export default useDrafts;
