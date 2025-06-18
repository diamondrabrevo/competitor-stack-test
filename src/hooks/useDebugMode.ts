
import { useState, useEffect } from 'react';

interface DebugModeState {
  showDebugLogs: boolean;
  setErrorOccurred: (occurred: boolean) => void;
}

export const useDebugMode = (): DebugModeState => {
  const [errorOccurred, setErrorOccurred] = useState(false);
  const [urlDebugEnabled, setUrlDebugEnabled] = useState(false);

  useEffect(() => {
    // Check URL parameter for debug mode
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get('debug');
    setUrlDebugEnabled(debugParam === 'true');
  }, []);

  // Show debug logs if either URL parameter is set OR an error occurred
  const showDebugLogs = urlDebugEnabled || errorOccurred;

  return {
    showDebugLogs,
    setErrorOccurred
  };
};
