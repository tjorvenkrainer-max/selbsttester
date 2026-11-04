import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Schriften lokal mitgeliefert (OFL) – keine Anfragen an fremde Server
import '@fontsource-variable/atkinson-hyperlegible-next';
import '@fontsource-variable/atkinson-hyperlegible-mono';
import '@fontsource-variable/shantell-sans';
import './styles/tokens.css';
import './styles/base.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline-Unterstützung nur im fertigen Build
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
