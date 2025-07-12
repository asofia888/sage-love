import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import ClearChatButton from '../../../components/ClearChatButton';

describe('ClearChatButton', () => {
  it('renders clear chat button', () => {
    render(<ClearChatButton onClear={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClear when clicked', () => {
    const onClear = vi.fn();
    render(<ClearChatButton onClear={onClear} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClear).toHaveBeenCalled();
  });
}); 