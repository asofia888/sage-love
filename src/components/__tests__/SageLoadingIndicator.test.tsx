import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import SageLoadingIndicator from '../../../components/SageLoadingIndicator';

describe('SageLoadingIndicator', () => {
  it('renders loading indicator', () => {
    render(<SageLoadingIndicator />);
    expect(screen.getByTestId('sage-loading-indicator')).toBeInTheDocument();
  });
}); 