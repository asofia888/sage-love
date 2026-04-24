import { describe, it } from 'vitest';
import { render } from '../../test/utils';
import { UserAvatarIcon } from '../icons/UserAvatarIcon';

describe('UserAvatarIcon', () => {
  it('renders without crashing', () => {
    render(<UserAvatarIcon />);
  });
}); 