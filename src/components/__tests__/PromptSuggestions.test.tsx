import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import PromptSuggestions from '../PromptSuggestions';

describe('PromptSuggestions', () => {
  it('renders multiple prompt suggestion buttons', () => {
    render(<PromptSuggestions onSelectPrompt={() => {}} textSize="normal" />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('calls onSelectPrompt when a suggestion is clicked', () => {
    const onSelectPrompt = vi.fn();
    render(<PromptSuggestions onSelectPrompt={onSelectPrompt} textSize="normal" />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onSelectPrompt).toHaveBeenCalledTimes(1);
    expect(typeof onSelectPrompt.mock.calls[0][0]).toBe('string');
  });
});
