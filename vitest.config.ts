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
      reporter: ['text', 'json', 'json-summary', 'html'],
      // api/（エンドポイント）と server/（セッション署名・レート制限・
      // サーキットブレーカー等のセキュリティ中核）はカバレッジ計測対象に含める
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.ts',
        'coverage/',
        'src/test/',
        'assets/',
        'i18n/',
        'types.ts',
        // 翻訳リソースとシステムプロンプトはロジックを持たない純粋なデータ
        // （文字列リテラルの集合）。分岐も関数もないので、カバレッジ率に
        // 混ぜると実態を歪める。
        //
        // 以前これらが「カバー済み」に見えていたのは、server/system-instruction.ts
        // が systemInstructionForSage を読むために locale を丸ごと import して
        // いた副作用にすぎない。プロンプトを server/prompts/ へ移した時点で
        // その偶然が消え、実質の変化が無いのにカバレッジが約25pt下がった。
        'src/lib/locales/',
        'server/prompts/',
      ],
      // CIで強制する下限（実測 Stmts81/Branch80/Func77/Lines81 に対し余裕を持たせた値）。
      // 下回るとtest:coverageが失敗する。カバレッジが上がったら引き上げること。
      thresholds: {
        statements: 78,
        branches: 75,
        functions: 74,
        lines: 78,
      },
    }
  },
  resolve: {
    alias: {
      '@/services': path.resolve(__dirname, './src/services'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/api': path.resolve(__dirname, './api'),
      '@/server': path.resolve(__dirname, './server'),
      '@': path.resolve(__dirname, './src'),
    }
  }
});