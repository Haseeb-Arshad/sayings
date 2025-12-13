/**
 * Draft Recording Service
 * High-level API for managing audio drafts
 */

import indexedDBService from './indexedDBService';
import axios from '../utils/axiosInstance';

class DraftRecordingService {
  /**
   * Create a new draft from a recording
   */
  async create(recordingBlob, metadata = {}) {
    const draftData = {
      audioBlob: recordingBlob,
      title: metadata.title || 'Untitled',
      description: metadata.description || '',
      topics: metadata.topics || [],
      transcript: metadata.transcript || '',
      privacy: metadata.privacy || 'public',
    };

    return indexedDBService.createDraft(draftData);
  }

  /**
   * Get all drafts
   */
  async list() {
    return indexedDBService.listDrafts();
  }

  /**
   * Get a specific draft
   */
  async get(id) {
    return indexedDBService.getDraft(id);
  }

  /**
   * Update draft metadata
   */
  async update(id, metadata) {
    const allowedFields = ['title', 'description', 'topics', 'transcript', 'privacy'];
    const updates = {};

    Object.keys(metadata).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = metadata[key];
      }
    });

    return indexedDBService.updateDraft(id, updates);
  }

  /**
   * Delete a draft
   */
  async delete(id) {
    return indexedDBService.deleteDraft(id);
  }

  /**
   * Publish a draft (upload to server)
   */
  async publish(id) {
    const draft = await indexedDBService.getDraft(id);
    if (!draft) {
      throw new Error(`Draft with id ${id} not found`);
    }

    try {
      // Update status to uploading
      await indexedDBService.updateDraftStatus(id, 'uploading');

      // Create form data for upload
      const formData = new FormData();
      formData.append('title', draft.title || 'Untitled');
      formData.append('file', draft.audioBlob, 'recording.webm');
      formData.append('transcript', draft.transcript || '');
      formData.append('topics', JSON.stringify(draft.topics || []));
      formData.append('privacy', draft.privacy || 'public');

      // Upload to server
      const response = await axios.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Mark as synced with the published post ID
      const publishedPostId = response.data._id || response.data.id;
      await indexedDBService.updateDraftStatus(id, 'synced', {
        publishedPostId,
      });

      return {
        success: true,
        draft: await indexedDBService.getDraft(id),
        publishedPost: response.data,
      };
    } catch (error) {
      // Revert status to saved_locally on error
      await indexedDBService.updateDraftStatus(id, 'saved_locally');
      throw error;
    }
  }

  /**
   * Get drafts pending upload
   */
  async getPendingUploads() {
    const savedLocally = await indexedDBService.getDraftsByStatus('saved_locally');
    const uploading = await indexedDBService.getDraftsByStatus('uploading');
    return [...uploading, ...savedLocally];
  }

  /**
   * Get synced drafts
   */
  async getSyncedDrafts() {
    return indexedDBService.getDraftsByStatus('synced');
  }

  /**
   * Attempt to sync all pending drafts
   */
  async syncPendingDrafts() {
    const pending = await this.getPendingUploads();
    const results = [];

    for (const draft of pending) {
      try {
        const result = await this.publish(draft.id);
        results.push({ id: draft.id, success: true, ...result });
      } catch (error) {
        results.push({
          id: draft.id,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get draft statistics
   */
  async getStats() {
    return indexedDBService.getStats();
  }

  /**
   * Clear all drafts (for testing/cleanup)
   */
  async clearAll() {
    return indexedDBService.clearAllDrafts();
  }
}

// Export singleton instance
const draftRecordingService = new DraftRecordingService();
export default draftRecordingService;
