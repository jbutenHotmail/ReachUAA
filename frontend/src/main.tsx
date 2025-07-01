import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import AppRoutes from './routes';
import './index.css';
import './i18n';
import StorageEventListener from './components/layout/StorageEventListener'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <StorageEventListener />
      <AppRoutes />
      <App />
    </Router>
  </StrictMode>
);