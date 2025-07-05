import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Disable strict TypeScript checking during build
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          // i18n libraries
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // AI/API libraries
          'ai-vendor': ['@google/generative-ai'],
          // Modal components (lazy loaded)
          'modal-components': [
            './components/DisclaimerModal',
            './components/PrivacyPolicyModal',
            './components/HelpModal',
            './components/ConfirmationModal',
            './components/CrisisInterventionModal'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
