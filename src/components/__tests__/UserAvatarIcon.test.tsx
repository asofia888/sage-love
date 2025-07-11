import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '../../test/utils';
import { UserAvatarIcon } from '../../../components/icons/UserAvatarIcon';

describe('UserAvatarIcon', () => {
  it('renders without crashing', () => {
    render(<UserAvatarIcon />);
  });
}); 