
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Prevention of "process is not defined" crashes from leftover SDK logic
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Critical: Root element not found");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
