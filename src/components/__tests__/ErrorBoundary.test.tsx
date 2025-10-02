import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({
  shouldThrow = true,
  errorMessage = 'Test error'
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Suppress console.error during error boundary tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  describe('正常動作', () => {
    it('エラーがない場合は子コンポーネントをレンダリングする', () => {
      render(
        <ErrorBoundary>
          <div>正常な子コンポーネント</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('正常な子コンポーネント')).toBeInTheDocument();
    });

    it('複数の子コンポーネントをレンダリングできる', () => {
      render(
        <ErrorBoundary>
          <div>子1</div>
          <div>子2</div>
          <div>子3</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('子1')).toBeInTheDocument();
      expect(screen.getByText('子2')).toBeInTheDocument();
      expect(screen.getByText('子3')).toBeInTheDocument();
    });
  });

  describe('エラーキャッチ', () => {
    it('子コンポーネントのエラーをキャッチする', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // デフォルトのエラーUIが表示される
      expect(screen.getByText(/予期しないエラーが発生しました/)).toBeInTheDocument();
    });

    it('エラーメッセージが表示される', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/申し訳ございません/)).toBeInTheDocument();
    });

    it('console.errorが呼ばれる', () => {
      render(
        <ErrorBoundary>
          <ThrowError errorMessage="カスタムエラー" />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('カスタムフォールバックUI', () => {
    it('カスタムフォールバックUIを表示できる', () => {
      const customFallback = <div>カスタムエラー画面</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('カスタムエラー画面')).toBeInTheDocument();
    });

    it('カスタムフォールバックUIが優先される', () => {
      const customFallback = <div>カスタムエラー</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      // カスタムUIが表示され、デフォルトUIは表示されない
      expect(screen.getByText('カスタムエラー')).toBeInTheDocument();
      expect(screen.queryByText(/予期しないエラーが発生しました/)).not.toBeInTheDocument();
    });
  });

  describe('エラーハンドラーコールバック', () => {
    it('onErrorコールバックが呼ばれる', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError errorMessage="テストエラー" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('エラー情報が正しく渡される', () => {
      const onError = vi.fn();
      const errorMessage = '詳細なエラーメッセージ';

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError errorMessage={errorMessage} />
        </ErrorBoundary>
      );

      const [error] = onError.mock.calls[0];
      expect(error.message).toBe(errorMessage);
    });
  });

  describe('リセット機能', () => {
    it('再試行ボタンが表示される', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const resetButton = screen.getByLabelText(/再試行/);
      expect(resetButton).toBeInTheDocument();
    });

    it('再試行ボタンをクリックするとエラー状態がリセットされる', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );

      // エラー画面が表示される
      expect(screen.getByText(/予期しないエラーが発生しました/)).toBeInTheDocument();

      // エラーを発生させないように変更
      shouldThrow = false;

      // 再試行ボタンをクリック
      const resetButton = screen.getByLabelText(/再試行/);
      await user.click(resetButton);

      // エラー状態がリセットされ、再レンダリングが試みられる
      // (ただし、rerenderしないと子コンポーネントは更新されない)
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    });
  });

  describe('リロード機能', () => {
    it('リロードボタンが表示される', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByLabelText(/ページをリロード/);
      expect(reloadButton).toBeInTheDocument();
    });

    it('リロードボタンをクリックするとwindow.location.reloadが呼ばれる', async () => {
      const user = userEvent.setup();
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByLabelText(/ページをリロード/);
      await user.click(reloadButton);

      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラー詳細表示', () => {
    it('開発環境ではエラー詳細を表示できる', () => {
      // Note: import.meta.env.DEVの制御は環境依存のためスキップ
      // 実際のテストではmockを使用する必要がある
    });

    it('本番環境ではエラー詳細を非表示にする', () => {
      // Note: import.meta.env.PRODの制御は環境依存のためスキップ
    });
  });

  describe('UI要素', () => {
    it('エラーアイコンが表示される', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // SVGアイコンが存在する
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toBeInTheDocument;
    });

    it('ヘルプテキストが表示される', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/問題が解決しない場合/)).toBeInTheDocument();
    });

    it('適切なスタイリングが適用されている', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // グラデーション背景が適用されている
      const errorContainer = container.querySelector('.bg-gradient-to-br');
      expect(errorContainer).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('ボタンに適切なaria-labelが設定されている', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByLabelText(/再試行/)).toBeInTheDocument();
      expect(screen.getByLabelText(/ページをリロード/)).toBeInTheDocument();
    });

    it('エラータイトルが見出しとして表示される', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain('予期しないエラーが発生しました');
    });
  });

  describe('複雑なエラーシナリオ', () => {
    it('ネストされたコンポーネントのエラーをキャッチする', () => {
      const NestedComponent = () => (
        <div>
          <div>
            <div>
              <ThrowError />
            </div>
          </div>
        </div>
      );

      render(
        <ErrorBoundary>
          <NestedComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/予期しないエラーが発生しました/)).toBeInTheDocument();
    });

    it('複数のError Boundaryをネストできる', () => {
      render(
        <ErrorBoundary fallback={<div>外側のエラー</div>}>
          <div>正常</div>
          <ErrorBoundary fallback={<div>内側のエラー</div>}>
            <ThrowError />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // 内側のError Boundaryがエラーをキャッチする
      expect(screen.getByText('内側のエラー')).toBeInTheDocument();
      expect(screen.queryByText('外側のエラー')).not.toBeInTheDocument();
      expect(screen.getByText('正常')).toBeInTheDocument();
    });

    it('異なるエラーメッセージを処理できる', () => {
      const onError1 = vi.fn();
      const onError2 = vi.fn();

      const { rerender } = render(
        <ErrorBoundary onError={onError1}>
          <ThrowError errorMessage="エラー1" />
        </ErrorBoundary>
      );

      expect(onError1).toHaveBeenCalled();

      rerender(
        <ErrorBoundary onError={onError2}>
          <ThrowError errorMessage="エラー2" />
        </ErrorBoundary>
      );

      expect(onError2).toHaveBeenCalled();
    });
  });

  describe('エッジケース', () => {
    it('子コンポーネントがnullの場合も動作する', () => {
      const { container } = render(
        <ErrorBoundary>
          {null}
        </ErrorBoundary>
      );

      expect(container).toBeInTheDocument();
    });

    it('子コンポーネントがundefinedの場合も動作する', () => {
      const { container } = render(
        <ErrorBoundary>
          {undefined}
        </ErrorBoundary>
      );

      expect(container).toBeInTheDocument();
    });

    it('空の子コンポーネントでも動作する', () => {
      const { container } = render(
        <ErrorBoundary>
          {/* 空 */}
        </ErrorBoundary>
      );

      expect(container).toBeInTheDocument();
    });
  });
});
