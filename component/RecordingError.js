// Recording Error UI Component
// Displays user-friendly error messages with recovery actions

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle, FaTimes, FaRedo, FaWifi } from 'react-icons/fa';
import { ErrorType } from '../services/RecordingService.js';

const ERROR_ICONS = {
  [ErrorType.NETWORK]: <FaWifi className="text-orange-500" />,
  [ErrorType.SERVER]: <FaExclamationTriangle className="text-red-500" />,
  [ErrorType.TIMEOUT]: <FaExclamationTriangle className="text-yellow-500" />,
  [ErrorType.PERMISSION]: <FaExclamationTriangle className="text-purple-500" />,
  [ErrorType.UNSUPPORTED]: <FaExclamationTriangle className="text-gray-500" />,
  [ErrorType.QUOTA]: <FaExclamationTriangle className="text-red-500" />,
  [ErrorType.ENCODING]: <FaExclamationTriangle className="text-yellow-500" />,
  [ErrorType.UNKNOWN]: <FaExclamationTriangle className="text-gray-500" />
};

export default function RecordingError({ 
  error, 
  onRetry, 
  onDismiss,
  retryDelay,
  retryCount,
  maxRetries = 5
}) {
  if (!error) return null;

  const showRetry = error.isRetryable && retryCount < maxRetries;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4"
        role="alert"
        aria-live="assertive"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {ERROR_ICONS[error.type] || ERROR_ICONS[ErrorType.UNKNOWN]}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {error.type === ErrorType.NETWORK && 'Connection Issue'}
                  {error.type === ErrorType.SERVER && 'Server Error'}
                  {error.type === ErrorType.TIMEOUT && 'Request Timeout'}
                  {error.type === ErrorType.PERMISSION && 'Permission Required'}
                  {error.type === ErrorType.UNSUPPORTED && 'Not Supported'}
                  {error.type === ErrorType.QUOTA && 'Storage Full'}
                  {error.type === ErrorType.ENCODING && 'Encoding Error'}
                  {error.type === ErrorType.UNKNOWN && 'Error'}
                </h3>
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Dismiss error"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {error.message}
            </p>

            {error.recoveryAction && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-1">
                  How to fix:
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {error.recoveryAction}
                </p>
              </div>
            )}

            {retryDelay && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-md p-3">
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  {retryDelay}
                </p>
              </div>
            )}

            {retryCount > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Retry attempt {retryCount} of {maxRetries}
              </p>
            )}
          </div>

          {/* Actions */}
          {(showRetry || onDismiss) && (
            <div className="flex items-center justify-end gap-2 p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                  Dismiss
                </button>
              )}
              {showRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-2"
                >
                  <FaRedo className="text-xs" />
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact inline error display (for use within forms)
export function InlineRecordingError({ error, onRetry, className = '' }) {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${className}`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {ERROR_ICONS[error.type] || ERROR_ICONS[ErrorType.UNKNOWN]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-800 dark:text-red-200">
          {error.message}
        </p>
        {error.recoveryAction && (
          <p className="text-xs text-red-600 dark:text-red-300 mt-1">
            {error.recoveryAction}
          </p>
        )}
      </div>
      {onRetry && error.isRetryable && (
        <button
          onClick={onRetry}
          className="flex-shrink-0 text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
        >
          Retry
        </button>
      )}
    </motion.div>
  );
}
