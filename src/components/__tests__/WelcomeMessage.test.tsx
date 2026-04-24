import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import WelcomeMessage from '../WelcomeMessage';

describe('WelcomeMessage', () => {
  it('renders welcome greeting', () => {
    render(<WelcomeMessage textSize="normal" />);
    expect(screen.getByText(/ようこそ/)).toBeInTheDocument();
  });
});
