import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

// localhost works directly; a secure HTTPS tunnel enables testing push from a phone.
const isLocalPushTestOrigin = import.meta.env.DEV && window.isSecureContext;

if ((import.meta.env.PROD || isLocalPushTestOrigin) && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The app remains fully usable when service workers are unavailable.
    });
  });
}
