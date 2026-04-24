import { describe, it } from 'vitest';
import { render } from '../../test/utils';
import PerformanceMonitor from '../PerformanceMonitor';

describe('PerformanceMonitor', () => {
  it('renders without crashing', () => {
    render(<PerformanceMonitor />);
  });
});
