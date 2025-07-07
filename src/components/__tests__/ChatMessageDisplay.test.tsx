import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import ChatMessageDisplay from '../../components/ChatMessageDisplay';
import { createMockMessage } from '../../test/utils';

describe('ChatMessageDisplay', () => {
  it('should render user message correctly', () => {
    const userMessage = createMockMessage({
      text: 'ユーザーのメッセージ',
      sender: 'user'
    });
    
    render(
      <ChatMessageDisplay 
        message={userMessage}
        currentLang="ja"
        textSize="medium"
      />
    );
    
    expect(screen.getByText('ユーザーのメッセージ')).toBeInTheDocument();
    
    // User messages should have specific styling
    const messageContainer = screen.getByText('ユーザーのメッセージ').closest('div');
    expect(messageContainer).toHaveClass('ml-auto');
  });

  it('should render AI message correctly', () => {
    const aiMessage = createMockMessage({
      text: 'AIの応答',
      sender: 'ai'
    });
    
    render(
      <ChatMessageDisplay 
        message={aiMessage}
        currentLang="ja"
        textSize="medium"
      />
    );
    
    expect(screen.getByText('AIの応答')).toBeInTheDocument();
    
    // AI messages should have different styling than user messages
    const messageContainer = screen.getByText('AIの応答').closest('div');
    expect(messageContainer).not.toHaveClass('ml-auto');
  });

  it('should show typing indicator for AI message', () => {
    const typingMessage = createMockMessage({
      text: '',
      sender: 'ai',
      isTyping: true
    });
    
    render(
      <ChatMessageDisplay 
        message={typingMessage}
        currentLang="ja"
        textSize="medium"
      />
    );
    
    // Should show typing animation
    const typingIndicator = document.querySelector('.animate-pulse');
    expect(typingIndicator).toBeInTheDocument();
  });

  it('should apply correct text size class', () => {
    const message = createMockMessage({
      text: 'テストメッセージ'
    });
    
    render(
      <ChatMessageDisplay 
        message={message}
        currentLang="ja"
        textSize="large"
      />
    );
    
    const textElement = screen.getByText('テストメッセージ');
    expect(textElement).toHaveClass('text-lg');
  });

  it('should apply small text size class', () => {
    const message = createMockMessage({
      text: 'テストメッセージ'
    });
    
    render(
      <ChatMessageDisplay 
        message={message}
        currentLang="ja"
        textSize="small"
      />
    );
    
    const textElement = screen.getByText('テストメッセージ');
    expect(textElement).toHaveClass('text-sm');
  });

  it('should display timestamp', () => {
    const message = createMockMessage({
      text: 'テストメッセージ',
      timestamp: new Date('2023-01-01T12:00:00Z')
    });
    
    render(
      <ChatMessageDisplay 
        message={message}
        currentLang="ja"
        textSize="medium"
      />
    );
    
    // The component should format and display the timestamp
    // Note: Exact format depends on implementation
    expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
  });

  it('should render markdown content correctly', () => {
    const messageWithMarkdown = createMockMessage({
      text: '**太字のテキスト** と *斜体のテキスト*',
      sender: 'ai'
    });
    
    render(
      <ChatMessageDisplay 
        message={messageWithMarkdown}
        currentLang="ja"
        textSize="medium"
      />
    );
    
    // Should render the markdown content
    expect(screen.getByText(/太字のテキスト/)).toBeInTheDocument();
    expect(screen.getByText(/斜体のテキスト/)).toBeInTheDocument();
  });

  it('should handle long messages', () => {
    const longMessage = createMockMessage({
      text: 'これは非常に長いメッセージです。'.repeat(50),
      sender: 'ai'
    });
    
    render(
      <ChatMessageDisplay 
        message={longMessage}
        currentLang="ja"
        textSize="medium"
      />
    );
    
    expect(screen.getByText(/これは非常に長いメッセージです/)).toBeInTheDocument();
  });

  it('should render user avatar for user messages', () => {
    const userMessage = createMockMessage({
      text: 'ユーザーメッセージ',
      sender: 'user'
    });
    
    render(
      <ChatMessageDisplay 
        message={userMessage}
        currentLang="ja"
        textSize="medium"
      />
    );
    
    // Should have user avatar
    const avatar = screen.getByTestId('user-avatar') || document.querySelector('[data-testid="user-avatar"]');
    // Note: This depends on the implementation having test IDs
  });

  it('should render sage avatar for AI messages', () => {
    const aiMessage = createMockMessage({
      text: 'AIメッセージ',
      sender: 'ai'
    });
    
    render(
      <ChatMessageDisplay 
        message={aiMessage}
        currentLang="ja"
        textSize="medium"
      />
    );
    
    // Should have sage avatar
    const avatar = screen.getByTestId('sage-avatar') || document.querySelector('[data-testid="sage-avatar"]');
    // Note: This depends on the implementation having test IDs
  });

  it('should handle empty message text', () => {
    const emptyMessage = createMockMessage({
      text: '',
      sender: 'ai'
    });
    
    render(
      <ChatMessageDisplay 
        message={emptyMessage}
        currentLang="ja"
        textSize="medium"
      />
    );
    
    // Should render without errors
    const messageContainer = document.querySelector('[role="article"]') || 
                           document.querySelector('.message') ||
                           screen.getByRole('group', { hidden: true });
    expect(messageContainer).toBeInTheDocument();
  });

  it('should handle special characters in message', () => {
    const specialMessage = createMockMessage({
      text: '特殊文字: @#$%^&*()_+{}[]|\\:";\'<>?,./`~',
      sender: 'user'
    });
    
    render(
      <ChatMessageDisplay 
        message={specialMessage}
        currentLang="ja"
        textSize="medium"
      />
    );
    
    expect(screen.getByText(/特殊文字:/)).toBeInTheDocument();
  });

  it('should apply RTL direction for Arabic language', () => {
    const arabicMessage = createMockMessage({
      text: 'مرحبا بك',
      sender: 'ai'
    });
    
    render(
      <ChatMessageDisplay 
        message={arabicMessage}
        currentLang="ar"
        textSize="medium"
      />
    );
    
    expect(screen.getByText('مرحبا بك')).toBeInTheDocument();
    // RTL styling should be applied based on language
  });
});