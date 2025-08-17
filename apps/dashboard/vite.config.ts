/* eslint-disable import/no-default-export */
/* eslint-disable simple-import-sort/imports */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
