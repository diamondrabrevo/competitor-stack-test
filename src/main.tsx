
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Custom CSS for animations used in LoadingState
import './animations.css';

// For better console debugging
console.log('Application starting with React version:', React.version);
console.log('Environment:', import.meta.env.MODE);
console.log('Base URL:', import.meta.env.BASE_URL);
console.log('Initial route:', window.location.pathname || '/');
console.log('Full URL:', window.location.href);

// Log when the app is running on root path
if (window.location.pathname === '/' || window.location.pathname === '') {
  console.log('App running on root path, should render Index component');
}

// Get the root element and render the app
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found! Make sure there's a div with id='root' in your HTML.");
}

createRoot(rootElement).render(<App />);

// Register a service worker if in production
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // This helps with page not found errors on Netlify
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
        .then(() => console.log('Service worker registered'))
        .catch(err => console.error('Service worker registration failed:', err));
    }
  });
}
