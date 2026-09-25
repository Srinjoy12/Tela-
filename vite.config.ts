import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  root: './frontend',
  envDir: '../',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@api': path.resolve(import.meta.dirname, './api'),
      '@': path.resolve(import.meta.dirname, './frontend/src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
