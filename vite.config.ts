import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Sentryへのソースマップアップロードは認証トークンがある時だけ有効化する。
// トークン未設定（ローカル/フォークCI）ではプラグインは無効・ソースマップも生成せず、
// 従来どおりのビルドになる。トークンありの本番CIでのみ:
//   1) sourcemap を生成 → 2) Sentryへアップロード → 3) 公開しないよう dist から削除
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const APP_VERSION = process.env.VITE_APP_VERSION || '1.0.0';

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    ...(command === 'build' && SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: SENTRY_AUTH_TOKEN,
            release: { name: `sages-love-ai@${APP_VERSION}` },
            sourcemaps: {
              // アップロード後にマップを削除し、公開バンドルには含めない
              filesToDeleteAfterUpload: ['./dist/**/*.js.map'],
            },
          }),
        ]
      : []),
  ],
  esbuild: {
    // Disable strict TypeScript checking during build
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    // 本番ビルドでは console.log/info/debug を除去する（warn/error は残す）
    ...(command === 'build'
      ? { pure: ['console.log', 'console.info', 'console.debug'] }
      : {}),
  },
  build: {
    outDir: 'dist',
    // Sentryトークンがある時だけソースマップを生成（上でアップロード後に削除される）
    sourcemap: !!SENTRY_AUTH_TOKEN,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          // i18n libraries
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // Modal components (lazy loaded)
          'modal-components': [
            './src/components/DisclaimerModal.tsx',
            './src/components/PrivacyPolicyModal.tsx',
            './src/components/HelpModal.tsx',
            './src/components/ConfirmationModal.tsx',
            './src/components/CrisisInterventionModal.tsx'
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
}));
