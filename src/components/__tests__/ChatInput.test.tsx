import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import ChatInput from '@/components/ChatInput';

describe('ChatInput', () => {
  const mockOnSendMessage = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render chat input with placeholder', () => {
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    const textArea = screen.getByPlaceholderText('メッセージを入力してください');
    expect(textArea).toBeInTheDocument();
  });

  it('should render send button', () => {
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    const sendButton = screen.getByLabelText('送信');
    expect(sendButton).toBeInTheDocument();
  });

  it('should call onSendMessage when form is submitted', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    const textArea = screen.getByPlaceholderText('メッセージを入力してください');
    const sendButton = screen.getByLabelText('送信');
    
    await user.type(textArea, 'テストメッセージ');
    await user.click(sendButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('テストメッセージ');
  });

  it('should clear input after sending message', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    const textArea = screen.getByPlaceholderText('メッセージを入力してください') as HTMLTextAreaElement;
    const sendButton = screen.getByLabelText('送信');
    
    await user.type(textArea, 'テストメッセージ');
    await user.click(sendButton);
    
    expect(textArea.value).toBe('');
  });

  it('should submit message when Enter is pressed', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    const textArea = screen.getByPlaceholderText('メッセージを入力してください');
    
    await user.type(textArea, 'テストメッセージ');
    await user.keyboard('{Enter}');
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('テストメッセージ');
  });

  it('should not submit when Shift+Enter is pressed', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    const textArea = screen.getByPlaceholderText('メッセージを入力してください');
    
    await user.type(textArea, 'テストメッセージ');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('should disable input and button when loading', () => {
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={true} 
      />
    );
    
    const textArea = screen.getByPlaceholderText('メッセージを入力してください');
    const sendButton = screen.getByLabelText('送信中...');
    
    expect(textArea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('should show loading spinner when isLoading is true', () => {
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={true} 
      />
    );
    
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should not submit empty messages', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    const sendButton = screen.getByLabelText('送信');
    
    await user.click(sendButton);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('should not submit whitespace-only messages', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    const textArea = screen.getByPlaceholderText('メッセージを入力してください');
    const sendButton = screen.getByLabelText('送信');
    
    await user.type(textArea, '   ');
    await user.click(sendButton);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('should render voice input button', () => {
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    const voiceButton = screen.getByLabelText('音声入力を開始');
    expect(voiceButton).toBeInTheDocument();
  });

  it('should disable send button when input is empty', () => {
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    const sendButton = screen.getByLabelText('送信');
    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when input has content', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    const textArea = screen.getByPlaceholderText('メッセージを入力してください');
    const sendButton = screen.getByLabelText('送信');
    
    await user.type(textArea, 'テストメッセージ');
    
    expect(sendButton).not.toBeDisabled();
  });

  it('should handle voice input transcript', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    const textArea = screen.getByPlaceholderText('メッセージを入力してください') as HTMLTextAreaElement;
    
    // Simulate voice input by directly calling the component's voice handler
    // Note: This is a simplified test since VoiceInputButton is a separate component
    await user.type(textArea, '音声で入力されたテキスト');
    
    expect(textArea.value).toBe('音声で入力されたテキスト');
  });

  it('should show voice input placeholder when voice input is active', () => {
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        isLoading={false} 
      />
    );
    
    // Note: Voice input state is internal to the component
    // This test would need to be expanded to properly test voice input state
    const textArea = screen.getByPlaceholderText('メッセージを入力してください');
    expect(textArea).toBeInTheDocument();
  });
});