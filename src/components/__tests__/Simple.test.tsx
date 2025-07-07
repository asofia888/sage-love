import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';

// Simple test component
const TestComponent = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="test-component">{children}</div>
);

describe('Simple Component Test', () => {
  it('should render test component', () => {
    render(<TestComponent>Hello World</TestComponent>);
    
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should handle different props', () => {
    render(<TestComponent>Test Content</TestComponent>);
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render with empty content', () => {
    render(<TestComponent></TestComponent>);
    
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });
});