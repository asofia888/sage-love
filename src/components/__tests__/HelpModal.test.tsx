import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import HelpModal from '../../../components/HelpModal';

describe('HelpModal', () => {
  it('renders modal when open', () => {
    render(<HelpModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/ヘルプ|help/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<HelpModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText(/ヘルプ|help/i)).toBeNull();
  });
}); 