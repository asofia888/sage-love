import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import LanguageSelector from '../../../components/LanguageSelector';

describe('LanguageSelector', () => {
  it('renders language options', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('日本語')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
  });
}); 