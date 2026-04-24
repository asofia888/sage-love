import { describe, it } from 'vitest';
import { render } from '../../test/utils';
import MultilingualSEO from '../SEO/MultilingualSEO';

describe('MultilingualSEO', () => {
  it('renders without crashing', () => {
    render(<MultilingualSEO />);
  });
});
