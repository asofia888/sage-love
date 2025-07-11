import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import TermsOfServiceModal from '../../../components/TermsOfServiceModal';

describe('TermsOfServiceModal', () => {
  it('renders modal when open', () => {
    render(<TermsOfServiceModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/利用規約|terms of service/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<TermsOfServiceModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText(/利用規約|terms of service/i)).toBeNull();
  });
}); 