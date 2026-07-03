import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '../../test/utils';
import PerformanceMonitor from '../PerformanceMonitor';

describe('PerformanceMonitor', () => {
  const observeCalls: Array<{ type?: string }> = [];

  class MockPerformanceObserver {
    static supportedEntryTypes = [
      'largest-contentful-paint',
      'first-input',
      'layout-shift',
      'paint',
    ];
    observe = vi.fn((options: { type?: string }) => {
      observeCalls.push(options);
    });
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
  }

  beforeEach(() => {
    observeCalls.length = 0;
    vi.stubGlobal('PerformanceObserver', MockPerformanceObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing visible (headless monitoring component)', () => {
    const { container } = render(<PerformanceMonitor />);
    expect(container.innerHTML).toBe('');
  });

  it('registers Web Vitals observers (LCP / FID / CLS / FCP)', () => {
    render(<PerformanceMonitor />);

    const observedTypes = observeCalls.map(o => o.type);
    expect(observedTypes).toContain('largest-contentful-paint');
    expect(observedTypes).toContain('first-input');
    expect(observedTypes).toContain('layout-shift');
    expect(observedTypes).toContain('paint');
  });

  it('does not crash when PerformanceObserver is unavailable (feature guard)', () => {
    vi.stubGlobal('PerformanceObserver', undefined);
    expect(() => render(<PerformanceMonitor />)).not.toThrow();
  });
});
