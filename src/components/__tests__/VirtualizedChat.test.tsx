import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import VirtualizedChat from '../../../components/VirtualizedChat';

describe('VirtualizedChat', () => {
  it('renders chat messages', () => {
    const messages = [
      { id: '1', text: 'テストメッセージ1', sender: 'user', timestamp: Date.now() },
      { id: '2', text: 'テストメッセージ2', sender: 'sage', timestamp: Date.now() }
    ];
    render(
      <VirtualizedChat
        messages={messages}
        userAvatarUrl=""
        sageAvatarUrl=""
        textSize="medium"
        onMessageClick={() => {}}
      />
    );
    expect(screen.getByText('テストメッセージ1')).toBeInTheDocument();
    expect(screen.getByText('テストメッセージ2')).toBeInTheDocument();
  });
}); 