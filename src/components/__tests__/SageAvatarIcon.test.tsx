import { describe, it } from 'vitest';
import { render } from '../../test/utils';
import { SageAvatarIcon } from '../icons/SageAvatarIcon';

describe('SageAvatarIcon', () => {
  it('renders without crashing', () => {
    render(<SageAvatarIcon />);
  });
}); 