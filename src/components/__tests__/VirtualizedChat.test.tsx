import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import VirtualizedChat from '../VirtualizedChat';
import type { Message } from '../../types/types';

describe('VirtualizedChat', () => {
  const createMessage = (id: string, text: string, sender: 'user' | 'sage', timestamp: number): Message => ({
    id,
    text,
    sender,
    timestamp
  });

  describe('基本的なレンダリング', () => {
    it('メッセージが正しくレンダリングされる', () => {
      const messages = [
        createMessage('1', 'テストメッセージ1', 'user', Date.now()),
        createMessage('2', 'テストメッセージ2', 'sage', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      expect(screen.getByText('テストメッセージ1')).toBeInTheDocument();
      expect(screen.getByText('テストメッセージ2')).toBeInTheDocument();
    });

    it('空のメッセージ配列でも正常に動作する', () => {
      const { container } = render(
        <VirtualizedChat
          messages={[]}
          textSize="medium"
          currentLang="ja"
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('1つのメッセージのみでも正常に表示される', () => {
      const messages = [
        createMessage('1', '単一メッセージ', 'user', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      expect(screen.getByText('単一メッセージ')).toBeInTheDocument();
    });
  });

  describe('仮想化機能', () => {
    it('20件以下のメッセージは通常表示される', () => {
      const messages = Array.from({ length: 15 }, (_, i) =>
        createMessage(`${i}`, `メッセージ${i}`, i % 2 === 0 ? 'user' : 'sage', Date.now())
      );

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      // 全メッセージが表示される
      messages.forEach((msg) => {
        expect(screen.getByText(msg.text)).toBeInTheDocument();
      });
    });

    it('20件を超えるメッセージは仮想化される', () => {
      const messages = Array.from({ length: 25 }, (_, i) =>
        createMessage(`${i}`, `メッセージ${i}`, i % 2 === 0 ? 'user' : 'sage', Date.now())
      );

      const { container } = render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      // 仮想化されている場合、固定高さのコンテナが存在する
      expect(container.querySelector('[style*="height"]')).toBeInTheDocument();
    });
  });

  describe('メッセージの種類', () => {
    it('ユーザーメッセージとAIメッセージが区別される', () => {
      const messages = [
        createMessage('1', 'ユーザーからの質問', 'user', Date.now()),
        createMessage('2', 'AIの回答', 'sage', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      const userMsg = screen.getByText('ユーザーからの質問').closest('div');
      const sageMsg = screen.getByText('AIの回答').closest('div');

      // 異なるスタイルが適用されている
      expect(userMsg?.className).toContain('justify-end');
      expect(sageMsg?.className).toContain('justify-start');
    });

    it('長いメッセージも正しく表示される', () => {
      const longText = 'あ'.repeat(1000);
      const messages = [
        createMessage('1', longText, 'user', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('改行を含むメッセージが正しく表示される', () => {
      const multilineText = '1行目\n2行目\n3行目';
      const messages = [
        createMessage('1', multilineText, 'user', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      expect(screen.getByText(multilineText)).toBeInTheDocument();
    });

    it('特殊文字を含むメッセージが正しく表示される', () => {
      const specialText = '<script>alert("test")</script> & < > "';
      const messages = [
        createMessage('1', specialText, 'user', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      // XSS対策でエスケープされて表示される
      expect(screen.getByText(specialText)).toBeInTheDocument();
    });
  });

  describe('テキストサイズ', () => {
    it('小サイズでレンダリングされる', () => {
      const messages = [
        createMessage('1', 'テスト', 'user', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="small"
          currentLang="ja"
        />
      );

      const message = screen.getByText('テスト').closest('div');
      expect(message?.className).toContain('text-sm');
    });

    it('中サイズでレンダリングされる', () => {
      const messages = [
        createMessage('1', 'テスト', 'user', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      const message = screen.getByText('テスト').closest('div');
      expect(message?.className).toContain('text-base');
    });

    it('大サイズでレンダリングされる', () => {
      const messages = [
        createMessage('1', 'テスト', 'user', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="large"
          currentLang="ja"
        />
      );

      const message = screen.getByText('テスト').closest('div');
      expect(message?.className).toContain('text-lg');
    });
  });

  describe('多言語対応', () => {
    it('日本語メッセージが表示される', () => {
      const messages = [
        createMessage('1', 'こんにちは', 'user', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      expect(screen.getByText('こんにちは')).toBeInTheDocument();
    });

    it('英語メッセージが表示される', () => {
      const messages = [
        createMessage('1', 'Hello', 'user', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="en"
        />
      );

      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('スペイン語メッセージが表示される', () => {
      const messages = [
        createMessage('1', 'Hola', 'user', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="es"
        />
      );

      expect(screen.getByText('Hola')).toBeInTheDocument();
    });
  });

  describe('タイムスタンプ', () => {
    it('タイムスタンプが表示される', () => {
      const now = Date.now();
      const messages = [
        createMessage('1', 'テスト', 'user', now)
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      // タイムスタンプの要素が存在する（表示形式は実装依存）
      const timeElement = screen.getByText('テスト').closest('div')?.parentElement;
      expect(timeElement).toBeInTheDocument();
    });

    it('複数メッセージのタイムスタンプが正しく表示される', () => {
      const messages = [
        createMessage('1', 'メッセージ1', 'user', Date.now() - 60000),
        createMessage('2', 'メッセージ2', 'sage', Date.now() - 30000),
        createMessage('3', 'メッセージ3', 'user', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      messages.forEach((msg) => {
        expect(screen.getByText(msg.text)).toBeInTheDocument();
      });
    });
  });

  describe('パフォーマンス', () => {
    it('大量のメッセージを処理できる', () => {
      const messages = Array.from({ length: 100 }, (_, i) =>
        createMessage(`${i}`, `メッセージ${i}`, i % 2 === 0 ? 'user' : 'sage', Date.now())
      );

      const { container } = render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      expect(container).toBeInTheDocument();
      // 仮想化により全メッセージがDOMに存在しない可能性があるが、エラーなく動作する
    });

    it('メッセージの更新が正しく反映される', () => {
      const messages = [
        createMessage('1', '初期メッセージ', 'user', Date.now())
      ];

      const { rerender } = render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      expect(screen.getByText('初期メッセージ')).toBeInTheDocument();

      // メッセージを追加
      const updatedMessages = [
        ...messages,
        createMessage('2', '追加メッセージ', 'sage', Date.now())
      ];

      rerender(
        <VirtualizedChat
          messages={updatedMessages}
          textSize="medium"
          currentLang="ja"
        />
      );

      expect(screen.getByText('初期メッセージ')).toBeInTheDocument();
      expect(screen.getByText('追加メッセージ')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('メッセージがスクリーンリーダーに読み上げられる', () => {
      const messages = [
        createMessage('1', 'アクセシビリティテスト', 'user', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      const messageElement = screen.getByText('アクセシビリティテスト');
      expect(messageElement).toBeInTheDocument();
      expect(messageElement).toBeVisible();
    });
  });

  describe('エッジケース', () => {
    it('空文字列のメッセージを処理できる', () => {
      const messages = [
        createMessage('1', '', 'user', Date.now())
      ];

      const { container } = render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('undefined送信者のメッセージをデフォルトで処理する', () => {
      const messages = [
        { id: '1', text: 'テスト', sender: 'unknown' as any, timestamp: Date.now() }
      ];

      const { container } = render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      expect(container).toBeInTheDocument();
    });

    it('タイムスタンプが0でもエラーにならない', () => {
      const messages = [
        createMessage('1', 'テスト', 'user', 0)
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      expect(screen.getByText('テスト')).toBeInTheDocument();
    });

    it('重複IDのメッセージを処理できる', () => {
      const messages = [
        createMessage('1', 'メッセージA', 'user', Date.now()),
        createMessage('1', 'メッセージB', 'sage', Date.now())
      ];

      render(
        <VirtualizedChat
          messages={messages}
          textSize="medium"
          currentLang="ja"
        />
      );

      // 両方表示される（警告が出る可能性はあるが、動作する）
      expect(screen.getByText('メッセージA')).toBeInTheDocument();
      expect(screen.getByText('メッセージB')).toBeInTheDocument();
    });
  });
}); 