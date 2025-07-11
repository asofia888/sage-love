import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '../../test/utils';
import GoogleAnalytics from '../../../components/GoogleAnalytics';

describe('GoogleAnalytics', () => {
  it('renders nothing (returns null)', () => {
    const { container } = render(<GoogleAnalytics />);
    expect(container.firstChild).toBeNull();
  });
}); 