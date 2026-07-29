import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializePwa } from './pwa/serviceWorkerRegistration';

if (import.meta.env.PROD) {
  void initializePwa();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
