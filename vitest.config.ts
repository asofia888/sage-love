import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // api/ はセキュリティ中核（セッション署名・レート制限・サーキットブレーカー）
      // なのでカバレッジ計測対象に含める
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.ts',
        'coverage/',
        'src/test/',
        'assets/',
        'i18n/',
        'types.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@/services': path.resolve(__dirname, './src/services'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/api': path.resolve(__dirname, './api'),
      '@': path.resolve(__dirname, './src'),
    }
  }
});