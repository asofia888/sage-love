import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '../../test/utils';
import PerformanceMonitor from '../../../components/PerformanceMonitor';

describe('PerformanceMonitor', () => {
  it('renders without crashing', () => {
    render(
      <PerformanceMonitor memoryStats={{ totalMessages: 10, memoryUsage: 123456, isNearLimit: false }} />
    );
  });
}); 