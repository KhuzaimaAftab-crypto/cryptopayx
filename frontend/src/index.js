import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Performance monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Report web vitals
function sendToAnalytics(metric) {
  if (process.env.NODE_ENV === 'production') {
    // Send to your analytics service
    // Web vitals monitoring
  }
}

// Measure Core Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);

// Service Worker registration
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        // Service worker registered successfully
      })
      .catch((registrationError) => {
        // Service worker registration failed
      });
  });
}

// Error tracking in production
if (process.env.NODE_ENV === 'production') {
  window.addEventListener('error', (event) => {
    // Global error handled
    // Send to error tracking service
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Unhandled promise rejection
    // Send to error tracking service
  });
}

// Create root and render app
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hot Module Replacement (HMR) for development
if (module.hot && process.env.NODE_ENV === 'development') {
  module.hot.accept('./App', () => {
    const NextApp = require('./App').default;
    root.render(
      <React.StrictMode>
        <NextApp />
      </React.StrictMode>
    );
  });
}