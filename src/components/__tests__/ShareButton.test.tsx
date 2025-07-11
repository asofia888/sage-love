import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import ShareButton from '../../../components/ShareButton';

describe('ShareButton', () => {
  it('renders share button', () => {
    render(<ShareButton />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls navigator.share when clicked', () => {
    const shareMock = vi.fn();
    Object.assign(navigator, { share: shareMock });
    render(<ShareButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(shareMock).toHaveBeenCalled();
  });
}); 