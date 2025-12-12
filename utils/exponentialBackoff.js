// Exponential backoff utility for retry logic
// Implements exponential backoff: 1s → 2s → 4s → 8s (max)

const MIN_DELAY = 1000; // 1 second
const MAX_DELAY = 8000; // 8 seconds

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current retry attempt (0-indexed)
 * @param {number} minDelay - Minimum delay in milliseconds (default 1000ms)
 * @param {number} maxDelay - Maximum delay in milliseconds (default 8000ms)
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoffDelay(attempt, minDelay = MIN_DELAY, maxDelay = MAX_DELAY) {
  const delay = minDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Wait for the calculated backoff delay
 * @param {number} attempt - Current retry attempt (0-indexed)
 * @param {number} minDelay - Minimum delay in milliseconds (default 1000ms)
 * @param {number} maxDelay - Maximum delay in milliseconds (default 8000ms)
 * @returns {Promise<void>}
 */
export function waitForBackoff(attempt, minDelay = MIN_DELAY, maxDelay = MAX_DELAY) {
  const delay = calculateBackoffDelay(attempt, minDelay, maxDelay);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Format delay in human-readable format
 * @param {number} delayMs - Delay in milliseconds
 * @returns {string} Human-readable delay string
 */
export function formatDelay(delayMs) {
  const seconds = Math.ceil(delayMs / 1000);
  if (seconds === 1) return '1 second';
  return `${seconds} seconds`;
}
