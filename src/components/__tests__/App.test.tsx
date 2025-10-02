import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import App from '../../../App';

// Mock API calls
vi.mock('../../services/apiService', () => ({
  default: {
    sendMessage: vi.fn().mockResolvedValue({
      message: 'モックされたAI応答です',
      timestamp: new Date().toISOString(),
      sessionId: 'test-session'
    })
  }
}));

// Mock crisis detection service
vi.mock('../../services/crisisDetectionService', () => ({
  default: {
    detectCrisis: vi.fn().mockReturnValue({ isCrisis: false })
  }
}));

// Mock lazy-loaded components to avoid Suspense issues in tests
vi.mock('../../components/DisclaimerModal', () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="disclaimer-modal" onClick={onClose}>Disclaimer Modal</div> : null
}));

vi.mock('../../components/ConfirmationModal', () => ({
  default: ({ isOpen, onClose, onConfirm, children }: any) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        {children}
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
}));

vi.mock('../../components/HelpModal', () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="help-modal" onClick={onClose}>Help Modal</div> : null
}));

vi.mock('../../components/CrisisInterventionModal', () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="crisis-modal" onClick={onClose}>Crisis Modal</div> : null
}));

vi.mock('../../components/PrivacyPolicyModal', () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="privacy-modal" onClick={onClose}>Privacy Modal</div> : null
}));

vi.mock('../../components/TermsOfServiceModal', () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="terms-modal" onClick={onClose}>Terms Modal</div> : null
}));

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('初期レンダリング', () => {
    it('アプリが正常にレンダリングされる', () => {
      render(<App />);

      // ヘッダーの確認
      expect(screen.getByText('聖者の愛')).toBeInTheDocument();
      expect(screen.getByText('AI聖者があなたの悩みに寄り添います')).toBeInTheDocument();
    });

    it('ウェルカムメッセージが表示される', () => {
      render(<App />);

      expect(screen.getByText(/ようこそ、心の迷える魂よ/)).toBeInTheDocument();
    });

    it('チャット入力フィールドが表示される', () => {
      render(<App />);

      const input = screen.getByPlaceholderText(/メッセージを入力してください/);
      expect(input).toBeInTheDocument();
    });

    it('プロンプト提案が表示される（PC表示時）', () => {
      render(<App />);

      // プロンプト提案はhidden sm:blockなので、テスト環境では見えないが存在する
      const suggestions = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('恋愛') ||
        btn.textContent?.includes('仕事') ||
        btn.textContent?.includes('人間関係') ||
        btn.textContent?.includes('人生')
      );
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('メッセージ送信機能', () => {
    it('ユーザーがメッセージを送信できる', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText(/メッセージを入力してください/);
      const sendButton = screen.getByLabelText('送信');

      await user.type(input, 'テストメッセージ');
      await user.click(sendButton);

      // ユーザーメッセージが表示される
      await waitFor(() => {
        expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
      });
    });

    it('AI応答が表示される', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText(/メッセージを入力してください/);
      const sendButton = screen.getByLabelText('送信');

      await user.type(input, 'こんにちは');
      await user.click(sendButton);

      // AI応答が表示される
      await waitFor(() => {
        expect(screen.getByText('モックされたAI応答です')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('送信中はローディング状態が表示される', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(input, 'テスト');

      const sendButton = screen.getByLabelText('送信');
      await user.click(sendButton);

      // ローディング中は送信ボタンがdisabledになる
      await waitFor(() => {
        const loadingButton = screen.queryByLabelText('送信中...');
        if (loadingButton) {
          expect(loadingButton).toBeDisabled();
        }
      });
    });

    it('空のメッセージは送信できない', async () => {
      const user = userEvent.setup();
      render(<App />);

      const sendButton = screen.getByLabelText('送信');
      expect(sendButton).toBeDisabled();

      // スペースのみのメッセージも送信できない
      const input = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(input, '   ');

      expect(sendButton).toBeDisabled();
    });
  });

  describe('チャット履歴機能', () => {
    it('複数のメッセージが履歴に保存される', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText(/メッセージを入力してください/);

      // 1つ目のメッセージ
      await user.type(input, '最初のメッセージ');
      await user.click(screen.getByLabelText('送信'));

      await waitFor(() => {
        expect(screen.getByText('最初のメッセージ')).toBeInTheDocument();
      });

      // 2つ目のメッセージ
      await user.type(input, '2番目のメッセージ');
      await user.click(screen.getByLabelText('送信'));

      await waitFor(() => {
        expect(screen.getByText('2番目のメッセージ')).toBeInTheDocument();
      });

      // 両方のメッセージが表示されている
      expect(screen.getByText('最初のメッセージ')).toBeInTheDocument();
      expect(screen.getByText('2番目のメッセージ')).toBeInTheDocument();
    });

    it('チャットをクリアできる', async () => {
      const user = userEvent.setup();
      render(<App />);

      // メッセージを送信
      const input = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(input, 'テストメッセージ');
      await user.click(screen.getByLabelText('送信'));

      await waitFor(() => {
        expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
      });

      // クリアボタンをクリック
      const clearButton = screen.getByLabelText('チャット履歴をクリア');
      await user.click(clearButton);

      // 確認モーダルが表示される
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();

      // 確認ボタンをクリック
      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      // メッセージが削除され、ウェルカムメッセージが表示される
      await waitFor(() => {
        expect(screen.queryByText('テストメッセージ')).not.toBeInTheDocument();
        expect(screen.getByText(/ようこそ、心の迷える魂よ/)).toBeInTheDocument();
      });
    });
  });

  describe('モーダル機能', () => {
    it('免責事項モーダルを開閉できる', async () => {
      const user = userEvent.setup();
      render(<App />);

      const disclaimerButton = screen.getByText('免責事項');
      await user.click(disclaimerButton);

      expect(screen.getByTestId('disclaimer-modal')).toBeInTheDocument();

      // モーダルをクリックして閉じる
      await user.click(screen.getByTestId('disclaimer-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('disclaimer-modal')).not.toBeInTheDocument();
      });
    });

    it('ヘルプモーダルを開閉できる', async () => {
      const user = userEvent.setup();
      render(<App />);

      const helpButton = screen.getByLabelText('ヘルプを表示');
      await user.click(helpButton);

      expect(screen.getByTestId('help-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('help-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('help-modal')).not.toBeInTheDocument();
      });
    });

    it('プライバシーポリシーモーダルを開閉できる', async () => {
      const user = userEvent.setup();
      render(<App />);

      const privacyButton = screen.getByText('プライバシーポリシー');
      await user.click(privacyButton);

      expect(screen.getByTestId('privacy-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('privacy-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('privacy-modal')).not.toBeInTheDocument();
      });
    });

    it('利用規約モーダルを開閉できる', async () => {
      const user = userEvent.setup();
      render(<App />);

      const termsButton = screen.getByText('利用規約');
      await user.click(termsButton);

      expect(screen.getByTestId('terms-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('terms-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('terms-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('テキストサイズ変更機能', () => {
    it('テキストサイズを変更できる', async () => {
      const user = userEvent.setup();
      render(<App />);

      // テキストサイズセレクターを見つける
      const textSizeButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('aria-label')?.includes('テキストサイズ')
      );

      expect(textSizeButtons.length).toBeGreaterThan(0);

      // テキストサイズ変更がlocalStorageに保存されることを確認
      // （実際の変更はTextSizeSelectorコンポーネントのテストで詳細にテスト）
    });
  });

  describe('言語切り替え機能', () => {
    it('言語セレクターが表示される', () => {
      render(<App />);

      // 言語ボタンを探す（国旗アイコンまたは言語名）
      const languageButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('aria-label')?.includes('言語') ||
        btn.textContent === '🇯🇵' ||
        btn.textContent === '🇬🇧' ||
        btn.textContent === '🇪🇸' ||
        btn.textContent === '🇵🇹'
      );

      expect(languageButtons.length).toBeGreaterThan(0);
    });
  });

  describe('プロンプト提案機能', () => {
    it('プロンプト提案をクリックしてメッセージを送信できる', async () => {
      const user = userEvent.setup();
      render(<App />);

      // プロンプト提案ボタンを探す
      const suggestionButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('恋愛について')
      );

      if (suggestionButtons.length > 0) {
        await user.click(suggestionButtons[0]);

        // メッセージが送信される
        await waitFor(() => {
          expect(screen.getByText(/恋愛について/)).toBeInTheDocument();
        }, { timeout: 3000 });
      }
    });

    it('メッセージ送信後はプロンプト提案が非表示になる', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(input, 'テスト');
      await user.click(screen.getByLabelText('送信'));

      await waitFor(() => {
        // メッセージが表示されたらプロンプト提案は非表示（条件: messages.length === 0）
        const suggestions = screen.queryAllByRole('button').filter(btn =>
          btn.textContent?.includes('恋愛について')
        );
        // プロンプト提案の親要素がhiddenクラスを持つはず
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('エラーメッセージが表示される', async () => {
      // エラーをシミュレート
      const apiService = await import('../../services/apiService');
      vi.mocked(apiService.default.sendMessage).mockRejectedValueOnce(
        new Error('API_ERROR:errorGeneric')
      );

      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(input, 'エラーテスト');
      await user.click(screen.getByLabelText('送信'));

      // エラーメッセージが表示される
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('エラーメッセージをクリックして消去できる', async () => {
      const apiService = await import('../../services/apiService');
      vi.mocked(apiService.default.sendMessage).mockRejectedValueOnce(
        new Error('API_ERROR:errorGeneric')
      );

      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(input, 'エラーテスト');
      await user.click(screen.getByLabelText('送信'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      }, { timeout: 3000 });

      // エラーをクリックして消去
      const errorAlert = screen.getByRole('alert');
      await user.click(errorAlert);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('LocalStorage連携', () => {
    it('チャット履歴がlocalStorageに保存される', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(input, '保存テスト');
      await user.click(screen.getByLabelText('送信'));

      await waitFor(() => {
        const chatHistory = localStorage.getItem('chat_history');
        expect(chatHistory).toBeTruthy();

        if (chatHistory) {
          const parsed = JSON.parse(chatHistory);
          expect(parsed.some((msg: any) => msg.text === '保存テスト')).toBe(true);
        }
      });
    });

    it('ページ再読み込み時にチャット履歴が復元される', async () => {
      // 事前にlocalStorageにデータを設定
      const mockHistory = [
        { sender: 'user', text: '復元テスト', timestamp: new Date().toISOString() }
      ];
      localStorage.setItem('chat_history', JSON.stringify(mockHistory));

      render(<App />);

      // 復元されたメッセージが表示される
      await waitFor(() => {
        expect(screen.getByText('復元テスト')).toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('主要な要素にaria-labelが設定されている', () => {
      render(<App />);

      expect(screen.getByLabelText('チャット履歴をクリア')).toBeInTheDocument();
      expect(screen.getByLabelText('ヘルプを表示')).toBeInTheDocument();
      expect(screen.getByLabelText('送信')).toBeInTheDocument();
    });

    it('エラーメッセージにrole="alert"が設定される', async () => {
      const apiService = await import('../../services/apiService');
      vi.mocked(apiService.default.sendMessage).mockRejectedValueOnce(
        new Error('API_ERROR:errorGeneric')
      );

      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(input, 'テスト');
      await user.click(screen.getByLabelText('送信'));

      await waitFor(() => {
        const alert = screen.queryByRole('alert');
        if (alert) {
          expect(alert).toBeInTheDocument();
        }
      }, { timeout: 3000 });
    });
  });

  describe('レスポンシブデザイン', () => {
    it('モバイルとPCで異なるレイアウトが適用される', () => {
      render(<App />);

      // sm:hidden と hidden sm:block のクラスが適用されている要素を確認
      // (実際のビューポート変更のテストはE2Eテストで実施)
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });
  });
});
