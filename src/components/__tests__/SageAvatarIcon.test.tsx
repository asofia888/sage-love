import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '../../test/utils';
import { SageAvatarIcon } from '../../../components/icons/SageAvatarIcon';

describe('SageAvatarIcon', () => {
  it('renders without crashing', () => {
    render(<SageAvatarIcon />);
  });
}); 