// hooks/usePageVisibility.js

import { useState, useEffect } from 'react';

/**
 * Hook to detect when the browser tab is hidden or visible
 * Useful for pausing polling/WebSocket activity when tab is not active
 */
const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  );

  useEffect(() => {
    // Only run in browser environment
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    // Add event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

export default usePageVisibility;
