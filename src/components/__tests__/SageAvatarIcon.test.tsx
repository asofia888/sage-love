import { describe, it, expect } from 'vitest';
import { render } from '../../test/utils';
import { SageAvatarIcon } from '../icons/SageAvatarIcon';

describe('SageAvatarIcon', () => {
  it('renders a decorative avatar hidden from screen readers', () => {
    const { container } = render(<SageAvatarIcon />);

    const avatar = container.firstElementChild;
    expect(avatar).not.toBeNull();
    // 装飾用アイコンなのでSRから隠す（隣接する本文が読み上げられる）
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    // 円形アバター + 賢者側の配色（sky系グラデーション）
    expect(avatar).toHaveClass('rounded-full');
    expect(avatar!.className).toContain('from-sky-500');
    expect(avatar!.querySelector('svg')).not.toBeNull();
  });
});
