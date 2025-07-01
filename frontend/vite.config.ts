import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-forms': ['react-hook-form'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-utils': ['date-fns', 'clsx', 'zustand'],
          'vendor-tables': ['@tanstack/react-table'],
        }
      }
    }
  }
});