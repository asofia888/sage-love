import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import TermsOfServiceModal from '../TermsOfServiceModal';

describe('TermsOfServiceModal', () => {
  it('renders modal when open', () => {
    render(<TermsOfServiceModal isOpen={true} onClose={() => {}} />);
    expect(screen.getAllByText(/利用規約/).length).toBeGreaterThan(0);
  });

  it('does not render when closed', () => {
    render(<TermsOfServiceModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText(/利用規約|terms of service/i)).toBeNull();
  });
}); 