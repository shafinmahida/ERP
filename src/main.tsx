import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Pre-warm the Tesseract.js singleton worker in the background at startup.
// This downloads the language pack once so the first passport scan is instant.
import { recognizeCanvasText } from './services/ocr/ocrEngine';
// Fire-and-forget: warm up canvas OCR worker at startup
setTimeout(() => {
  const dummyCanvas = document.createElement('canvas');
  dummyCanvas.width = 10;
  dummyCanvas.height = 10;
  recognizeCanvasText(dummyCanvas).catch(() => { /* silent pre-warm */ });
}, 2000);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
