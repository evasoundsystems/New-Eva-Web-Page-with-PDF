import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

declare global {
  interface Window {
    __EVA_APP_MOUNTED__?: boolean;
    __EVA_SHOW_BOOT_ERROR__?: (message: string) => void;
  }
}

const rootEl = document.getElementById('root');

if (rootEl) {
  try {
    createRoot(rootEl).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    window.__EVA_APP_MOUNTED__ = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('React mount error:', err);
    if (typeof window.__EVA_SHOW_BOOT_ERROR__ === 'function') {
      window.__EVA_SHOW_BOOT_ERROR__(message);
    }
  }
}
