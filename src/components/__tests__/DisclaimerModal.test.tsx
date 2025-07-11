import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import DisclaimerModal from '../../../components/DisclaimerModal';

describe('DisclaimerModal', () => {
  it('renders modal when open', () => {
    render(<DisclaimerModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/免責事項|disclaimer/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<DisclaimerModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText(/免責事項|disclaimer/i)).toBeNull();
  });
}); 