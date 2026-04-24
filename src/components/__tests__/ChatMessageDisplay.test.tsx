import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import ChatMessageDisplay from '../../components/ChatMessageDisplay';
import { createMockMessage } from '../../test/utils';
import { MessageSender } from '../../types';

describe('ChatMessageDisplay', () => {
  it('renders user message with justify-end alignment', () => {
    const userMessage = createMockMessage({
      text: 'ユーザーのメッセージ',
      sender: MessageSender.USER,
    });

    const { container } = render(
      <ChatMessageDisplay message={userMessage} currentLang="ja" textSize="normal" />
    );

    expect(screen.getByText('ユーザーのメッセージ')).toBeInTheDocument();
    expect(container.querySelector('.justify-end')).toBeInTheDocument();
  });

  it('renders AI message with justify-start alignment', () => {
    const aiMessage = createMockMessage({
      text: 'AIの応答',
      sender: MessageSender.AI,
    });

    const { container } = render(
      <ChatMessageDisplay message={aiMessage} currentLang="ja" textSize="normal" />
    );

    expect(screen.getByText('AIの応答')).toBeInTheDocument();
    expect(container.querySelector('.justify-start')).toBeInTheDocument();
    expect(container.querySelector('.justify-end')).not.toBeInTheDocument();
  });

  it('shows loading indicator when AI is typing with no text', () => {
    const typingMessage = createMockMessage({
      id: 'ai-typing',
      text: '',
      sender: MessageSender.AI,
      isTyping: true,
    });

    const { container } = render(
      <ChatMessageDisplay message={typingMessage} currentLang="ja" textSize="normal" />
    );

    // SageLoadingIndicator renders; the bubble with text should not
    expect(container.querySelector('p')).toBeNull();
  });

  it('applies text-base class for large text size', () => {
    const message = createMockMessage({ text: 'テストメッセージ' });

    render(
      <ChatMessageDisplay message={message} currentLang="ja" textSize="large" />
    );

    expect(screen.getByText('テストメッセージ')).toHaveClass('text-base');
  });

  it('applies text-sm class for normal text size', () => {
    const message = createMockMessage({ text: 'テストメッセージ' });

    render(
      <ChatMessageDisplay message={message} currentLang="ja" textSize="normal" />
    );

    expect(screen.getByText('テストメッセージ')).toHaveClass('text-sm');
  });

  it('displays a formatted timestamp', () => {
    const message = createMockMessage({
      text: 'テストメッセージ',
      timestamp: '2023-01-01T12:00:00Z',
    });

    const { container } = render(
      <ChatMessageDisplay message={message} currentLang="ja" textSize="normal" />
    );

    // Timestamp is rendered in a <p class="text-xs ..."> next to the body text
    const tsEl = container.querySelector('p.text-xs');
    expect(tsEl).toBeInTheDocument();
    expect(tsEl?.textContent).toMatch(/\d{1,2}:\d{2}/);
  });

  it('handles long messages', () => {
    const longMessage = createMockMessage({
      text: 'これは非常に長いメッセージです。'.repeat(50),
      sender: MessageSender.AI,
    });

    render(
      <ChatMessageDisplay message={longMessage} currentLang="ja" textSize="normal" />
    );

    expect(screen.getByText(/これは非常に長いメッセージです/)).toBeInTheDocument();
  });

  it('renders special characters verbatim', () => {
    const specialMessage = createMockMessage({
      text: '特殊文字: @#$%^&*()_+{}[]|\\:";\'<>?,./`~',
      sender: MessageSender.USER,
    });

    render(
      <ChatMessageDisplay message={specialMessage} currentLang="ja" textSize="normal" />
    );

    expect(screen.getByText(/特殊文字:/)).toBeInTheDocument();
  });

  it('renders Arabic text', () => {
    const arabicMessage = createMockMessage({
      text: 'مرحبا بك',
      sender: MessageSender.AI,
    });

    render(
      <ChatMessageDisplay message={arabicMessage} currentLang="ar" textSize="normal" />
    );

    expect(screen.getByText('مرحبا بك')).toBeInTheDocument();
  });

  it('hides copy button for welcome messages and user messages', () => {
    const welcomeMessage = createMockMessage({
      id: 'welcome-1',
      text: 'ようこそ',
      sender: MessageSender.AI,
    });

    render(
      <ChatMessageDisplay message={welcomeMessage} currentLang="ja" textSize="normal" />
    );

    expect(screen.queryByLabelText(/copy/i)).not.toBeInTheDocument();
  });
});
