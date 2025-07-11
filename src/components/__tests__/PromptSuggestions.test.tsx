import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import PromptSuggestions from '../../../components/PromptSuggestions';

describe('PromptSuggestions', () => {
  it('renders prompt suggestions', () => {
    render(<PromptSuggestions onSelectPrompt={() => {}} textSize="medium" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
}); 