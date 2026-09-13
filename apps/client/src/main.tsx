import React from 'react';
import ReactDOM from 'react-dom/client';
import ClientApp from './App';
import ErrorBoundary from '../../../src/components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ClientApp />
    </ErrorBoundary>
  </React.StrictMode>,
);
