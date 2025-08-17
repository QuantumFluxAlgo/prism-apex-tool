/* eslint-disable simple-import-sort/imports */
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// eslint-disable-next-line import/no-unresolved
import { App } from './App.js';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
