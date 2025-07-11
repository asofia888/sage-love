import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '../../test/utils';
import SEOContent from '../../../components/SEOContent';

describe('SEOContent', () => {
  it('renders without crashing', () => {
    render(<SEOContent />);
  });
}); 