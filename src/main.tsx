import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Pre-warm the Tesseract.js singleton worker in the background at startup.
// This downloads the language pack once so the first passport scan is instant.
import { runOfflineOcr } from './services/ocr/ocrEngine';
// Fire-and-forget: warm up with an empty string (returns immediately but initializes worker)
setTimeout(() => {
  runOfflineOcr('').catch(() => { /* silent — just pre-initializing */ });
}, 2000);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
