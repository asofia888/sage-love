import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import SageLoadingIndicator from '../SageLoadingIndicator';

describe('SageLoadingIndicator', () => {
  it('renders a status region', () => {
    render(<SageLoadingIndicator />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
