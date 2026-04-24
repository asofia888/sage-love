import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import TextSizeSelector from '../TextSizeSelector';

describe('TextSizeSelector', () => {
  it('renders normal and large size options', () => {
    render(<TextSizeSelector currentTextSize="normal" onSetTextSize={() => {}} />);
    expect(screen.getByText('標準')).toBeInTheDocument();
    expect(screen.getByText('大')).toBeInTheDocument();
  });

  it('calls onSetTextSize with "large" when large option is clicked', () => {
    const onSetTextSize = vi.fn();
    render(<TextSizeSelector currentTextSize="normal" onSetTextSize={onSetTextSize} />);
    fireEvent.click(screen.getByText('大'));
    expect(onSetTextSize).toHaveBeenCalledWith('large');
  });

  it('marks the current size as pressed', () => {
    render(<TextSizeSelector currentTextSize="large" onSetTextSize={() => {}} />);
    const largeButton = screen.getByText('大').closest('button');
    expect(largeButton).toHaveAttribute('aria-pressed', 'true');
  });
});
