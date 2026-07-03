import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '../../test/utils';
import MultilingualSEO from '../SEO/MultilingualSEO';

describe('MultilingualSEO', () => {
  beforeEach(() => {
    document.title = '';
    // 既存のmetaタグを用意しておき、コンポーネントが値を「更新」することを検証する
    document
      .querySelectorAll('meta[name="description"], meta[property="og:title"]')
      .forEach(el => el.remove());

    const description = document.createElement('meta');
    description.setAttribute('name', 'description');
    description.setAttribute('content', 'initial');
    document.head.appendChild(description);

    const ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    ogTitle.setAttribute('content', 'initial');
    document.head.appendChild(ogTitle);
  });

  it('sets the localized document title (appName | seoTitle)', () => {
    render(<MultilingualSEO />);

    // テスト用i18nはja固定
    expect(document.title).toBe(
      '聖者の愛（AI） | 賢者の智慧でスピリチュアル相談 - 無料AIカウンセリング'
    );
  });

  it('updates description and og:title meta tags with localized values', () => {
    render(<MultilingualSEO />);

    const description = document.querySelector('meta[name="description"]');
    expect(description?.getAttribute('content')).toContain('聖者の愛（AI）');
    expect(description?.getAttribute('content')).not.toBe('initial');

    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle?.getAttribute('content')).toContain('賢者の智慧');
  });
});
