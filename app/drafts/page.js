'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DraftWaveformPreview from '../../component/DraftWaveformPreview';
import DraftEditModal from '../../component/DraftEditModal';
import useDrafts from '../../hooks/useDrafts';
import useBackgroundSync from '../../hooks/useBackgroundSync';
import styles from '../../styles/Home.module.css';

export default function DraftsPage() {
  const {
    drafts,
    isLoading,
    error,
    stats,
    updateDraft,
    deleteDraft,
    publishDraft,
  } = useDrafts();

  // Enable background sync
  useBackgroundSync();

  const [editingDraftId, setEditingDraftId] = useState(null);
  const [deletingDraftId, setDeletingDraftId] = useState(null);
  const [publishingDraftId, setPublishingDraftId] = useState(null);

  const editingDraft = drafts.find((d) => d.id === editingDraftId);

  const handleDeleteClick = (draftId) => {
    setDeletingDraftId(draftId);
  };

  const handleConfirmDelete = async (draftId) => {
    try {
      await deleteDraft.mutateAsync(draftId);
      setDeletingDraftId(null);
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  };

  const handleSaveDraft = async (metadata) => {
    try {
      await updateDraft.mutateAsync({
        id: editingDraftId,
        metadata,
      });
      setEditingDraftId(null);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const handlePublishDraft = async (metadata) => {
    setPublishingDraftId(editingDraftId);
    try {
      // First update metadata if changed
      if (metadata) {
        await updateDraft.mutateAsync({
          id: editingDraftId,
          metadata,
        });
      }
      // Then publish
      await publishDraft.mutateAsync(editingDraftId);
      setEditingDraftId(null);
    } catch (error) {
      console.error('Failed to publish draft:', error);
    } finally {
      setPublishingDraftId(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      saved_locally: {
        bg: 'bg-yellow-100 dark:bg-yellow-900',
        text: 'text-yellow-800 dark:text-yellow-100',
        label: '💾 Saved Locally',
      },
      uploading: {
        bg: 'bg-blue-100 dark:bg-blue-900',
        text: 'text-blue-800 dark:text-blue-100',
        label: '⬆️ Uploading',
      },
      synced: {
        bg: 'bg-green-100 dark:bg-green-900',
        text: 'text-green-800 dark:text-green-100',
        label: '✅ Synced',
      },
    };
    const badge = badges[status] || badges.saved_locally;
    return `${badge.bg} ${badge.text}`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className={styles.home}>
      <div className={styles.postsContainer} id="scrollableDiv">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 z-10"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Drafts
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your offline drafts and queued uploads
          </p>

          {/* Stats */}
          {stats && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Saved Locally</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.savedLocally}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Uploading</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.uploading}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Synced</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.synced}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Loading state */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center items-center h-64"
          >
            <p className="text-gray-600 dark:text-gray-400">Loading drafts...</p>
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="m-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          >
            <p className="text-red-800 dark:text-red-100">
              Error loading drafts: {error.message}
            </p>
          </motion.div>
        )}

        {/* Empty state */}
        {!isLoading && drafts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <p className="text-2xl mb-2">📝</p>
            <p className="text-gray-600 dark:text-gray-400">
              No drafts yet. Start recording to create one!
            </p>
          </motion.div>
        )}

        {/* Drafts list */}
        <AnimatePresence>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {drafts.map((draft, index) => (
              <motion.div
                key={draft.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="space-y-4">
                  {/* Title and meta */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {draft.title || 'Untitled'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(draft.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(
                        draft.status
                      )}`}
                    >
                      {draft.status === 'saved_locally' && '💾 Saved'}
                      {draft.status === 'uploading' && '⬆️ Uploading'}
                      {draft.status === 'synced' && '✅ Synced'}
                    </span>
                  </div>

                  {/* Waveform preview */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <DraftWaveformPreview audioBlob={draft.audioBlob} height={50} />
                  </div>

                  {/* Description */}
                  {draft.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {draft.description}
                    </p>
                  )}

                  {/* Topics */}
                  {draft.topics && draft.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {draft.topics.map((topic) => (
                        <span
                          key={topic}
                          className="px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Transcript preview */}
                  {draft.transcript && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      <span className="font-medium">Transcript:</span> {draft.transcript}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setEditingDraftId(draft.id)}
                      disabled={draft.status === 'uploading'}
                      className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Edit & Publish
                    </button>
                    <button
                      onClick={() => handleDeleteClick(draft.id)}
                      disabled={draft.status === 'uploading'}
                      className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>

      {/* Edit Modal */}
      <DraftEditModal
        draft={editingDraft}
        isOpen={!!editingDraftId}
        onClose={() => setEditingDraftId(null)}
        onSave={handleSaveDraft}
        onPublish={handlePublishDraft}
        isPublishing={publishingDraftId === editingDraftId}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingDraftId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingDraftId(null)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Delete Draft?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  This action cannot be undone. Are you sure you want to delete this draft?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeletingDraftId(null)}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmDelete(deletingDraftId)}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
