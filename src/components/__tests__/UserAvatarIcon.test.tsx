import { describe, it, expect } from 'vitest';
import { render } from '../../test/utils';
import { UserAvatarIcon } from '../icons/UserAvatarIcon';

describe('UserAvatarIcon', () => {
  it('renders a decorative avatar hidden from screen readers', () => {
    const { container } = render(<UserAvatarIcon />);

    const avatar = container.firstElementChild;
    expect(avatar).not.toBeNull();
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    // ユーザー側の配色（emerald系）で賢者側と視覚的に区別される
    expect(avatar).toHaveClass('rounded-full');
    expect(avatar!.className).toContain('from-emerald-500');
    expect(avatar!.querySelector('svg')).not.toBeNull();
  });
});
