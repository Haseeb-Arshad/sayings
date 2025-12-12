// Upload Queue Status Component
// Displays pending uploads and retry status

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCloudUploadAlt, FaSpinner, FaCheck, FaTimes, FaExclamationCircle } from 'react-icons/fa';
import uploadQueue from '../services/UploadQueue.js';

export default function UploadQueueStatus() {
  const [status, setStatus] = useState({
    total: 0,
    pending: 0,
    waiting: 0,
    isProcessing: false,
    items: []
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Initial load
    loadStatus();

    // Listen to queue events
    const handleQueueEvent = (event, data) => {
      loadStatus();
    };

    uploadQueue.addListener(handleQueueEvent);

    // Refresh status periodically
    const interval = setInterval(loadStatus, 5000);

    return () => {
      uploadQueue.removeListener(handleQueueEvent);
      clearInterval(interval);
    };
  }, []);

  const loadStatus = async () => {
    const newStatus = await uploadQueue.getQueueStatus();
    setStatus(newStatus);
  };

  if (status.total === 0) {
    return null;
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return `${Math.floor(diff / 86400000)}d ago`;
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / 1024 / 1024 * 10) / 10} MB`;
  };

  const formatNextRetry = (nextRetryAt) => {
    const now = Date.now();
    const diff = nextRetryAt - now;
    
    if (diff <= 0) {
      return 'Retrying now...';
    }
    
    const seconds = Math.ceil(diff / 1000);
    if (seconds < 60) {
      return `Retrying in ${seconds}s`;
    }
    
    const minutes = Math.ceil(seconds / 60);
    return `Retrying in ${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]"
    >
      {/* Compact header */}
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {status.isProcessing ? (
              <FaSpinner className="text-blue-500 animate-spin" />
            ) : status.pending > 0 ? (
              <FaCloudUploadAlt className="text-blue-500" />
            ) : (
              <FaExclamationCircle className="text-yellow-500" />
            )}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {status.isProcessing ? 'Uploading...' : 'Pending Uploads'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {status.pending > 0
                  ? `${status.pending} ready to upload`
                  : `${status.waiting} waiting to retry`}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400"
          >
            ▼
          </motion.div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                {status.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-md bg-gray-50 dark:bg-gray-900/50"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {item.retryCount === 0 ? (
                        <FaCloudUploadAlt className="text-blue-500 text-sm" />
                      ) : (
                        <FaExclamationCircle className="text-yellow-500 text-sm" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-900 dark:text-white">
                          Upload {index + 1}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatSize(item.size)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatTimestamp(item.timestamp)}
                      </p>
                      {item.errorType && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          Error: {item.errorType}
                        </p>
                      )}
                      {item.retryCount > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatNextRetry(item.nextRetryAt)} (Attempt {item.retryCount + 1})
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    uploadQueue.processQueue();
                  }}
                  disabled={status.isProcessing}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Retry Now
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Clear all pending uploads?')) {
                      uploadQueue.clearQueue();
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
