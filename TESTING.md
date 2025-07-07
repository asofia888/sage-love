# テストガイド

このプロジェクトでは [Vitest](https://vitest.dev/) と [Testing Library](https://testing-library.com/) を使用してテストを実装しています。

## テスト実行

### 基本的なテスト実行
```bash
# 全テストを実行
npm test

# テストを1回だけ実行
npm run test:run

# カバレッジ付きでテスト実行
npm run test:coverage

# ウォッチモードでテスト実行
npm run test:watch

# UI付きでテスト実行
npm run test:ui
```

## テスト構成

### ディレクトリ構造
```
src/
├── test/
│   ├── setup.ts          # テスト環境の設定
│   └── utils.tsx         # テストユーティリティ
├── components/
│   └── __tests__/        # コンポーネントテスト
├── services/
│   └── __tests__/        # サービステスト
├── hooks/
│   └── __tests__/        # フックテスト
└── api/
    └── __tests__/        # APIテスト
```

### テストファイル命名規則
- コンポーネント: `ComponentName.test.tsx`
- サービス: `serviceName.test.ts`
- フック: `useHookName.test.ts`
- API: `endpointName.test.ts`

## テストカテゴリ

### 1. ユニットテスト
個別の関数やコンポーネントをテストします。

**例: サービステスト**
```typescript
import { CrisisDetectionService } from '../crisisDetectionService';

describe('CrisisDetectionService', () => {
  it('should detect crisis keywords', () => {
    const result = CrisisDetectionService.detectCrisis('死にたい');
    expect(result.isCrisis).toBe(true);
  });
});
```

### 2. コンポーネントテスト
Reactコンポーネントのレンダリングと相互作用をテストします。

**例: ChatInputテスト**
```typescript
import { render, screen } from '../../test/utils';
import ChatInput from '../ChatInput';

describe('ChatInput', () => {
  it('should send message when form is submitted', async () => {
    const mockOnSend = vi.fn();
    render(<ChatInput onSendMessage={mockOnSend} isLoading={false} />);
    
    const input = screen.getByPlaceholderText('メッセージを入力してください');
    await userEvent.type(input, 'テストメッセージ');
    await userEvent.click(screen.getByLabelText('送信'));
    
    expect(mockOnSend).toHaveBeenCalledWith('テストメッセージ');
  });
});
```

### 3. 統合テスト
複数のコンポーネントやサービスの連携をテストします。

**例: APIエンドポイントテスト**
```typescript
describe('Chat API Handler', () => {
  it('should handle successful chat request', async () => {
    const request = new Request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'こんにちは' })
    });
    
    const response = await chatHandler.default(request);
    expect(response.status).toBe(200);
  });
});
```

## テストユーティリティ

### カスタムレンダー
i18nプロバイダーでラップしたレンダー関数を提供します。

```typescript
import { render } from '../../test/utils';

// 自動的にi18nプロバイダーでラップされます
render(<MyComponent />);
```

### モックデータファクトリー
テストデータを簡単に生成できます。

```typescript
import { createMockMessage, createMockChatHistory } from '../../test/utils';

const message = createMockMessage({
  text: 'カスタムメッセージ',
  sender: 'user'
});

const history = createMockChatHistory(5); // 5件のメッセージ履歴
```

### fetchモック
API呼び出しをモックします。

```typescript
import { mockFetch } from '../../test/utils';

global.fetch = mockFetch({ message: 'テスト応答' });
```

## モック戦略

### 1. 外部依存関係
```typescript
// Google Generative AIをモック
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn()
    }))
  }))
}));
```

### 2. ブラウザAPI
```typescript
// localStorage, fetch, Web Speech APIなどは setup.ts でモック済み
```

### 3. 環境変数
```typescript
vi.mock('process', () => ({
  env: {
    GEMINI_API_KEY: 'test-api-key'
  }
}));
```

## カバレッジ要件

### 目標カバレッジ
- **ライン**: 80%以上
- **関数**: 80%以上
- **ブランチ**: 70%以上
- **ステートメント**: 80%以上

### 除外ファイル
以下のファイルはカバレッジ計算から除外されます：
- `node_modules/`
- `dist/`
- `*.d.ts`
- `*.config.ts`
- `src/test/`
- `api/` (Vercel Edge関数)

## CI/CD統合

### GitHub Actions
`.github/workflows/test.yml` でテストが自動実行されます：
- プルリクエスト時
- メインブランチへのプッシュ時
- 複数のNode.jsバージョンでテスト

### テスト失敗時の対応
1. ローカルでテストを実行して問題を特定
2. 必要に応じてテストを修正
3. カバレッジが下がった場合は新しいテストを追加

## ベストプラクティス

### 1. テスト命名
```typescript
describe('Component/Service Name', () => {
  it('should [期待される動作] when [条件]', () => {
    // テスト実装
  });
});
```

### 2. テストの独立性
- 各テストは独立して実行可能
- `beforeEach`/`afterEach`でクリーンアップ
- モックは各テストで初期化

### 3. 実際のユーザー操作をテスト
```typescript
// ❌ 実装詳細をテスト
expect(component.state.isLoading).toBe(true);

// ✅ ユーザーが見える動作をテスト
expect(screen.getByText('読み込み中...')).toBeInTheDocument();
```

### 4. 適切なセレクター使用
```typescript
// 推奨順序
screen.getByRole('button', { name: '送信' })     // アクセシビリティ
screen.getByLabelText('メッセージ入力')          // ラベル
screen.getByPlaceholderText('入力してください')   // プレースホルダー
screen.getByTestId('send-button')               // テストID（最後の手段）
```

## トラブルシューティング

### よくある問題

**1. モジュールインポートエラー**
```typescript
// ESモジュールの場合
import { vi } from 'vitest';

// CommonJSとの混在を避ける
```

**2. 非同期テストのタイムアウト**
```typescript
// waitForを使用
await waitFor(() => {
  expect(screen.getByText('完了')).toBeInTheDocument();
});
```

**3. i18nが初期化されない**
```typescript
// カスタムrenderを使用
import { render } from '../../test/utils';
```

詳細な情報は [Vitest公式ドキュメント](https://vitest.dev/) を参照してください。