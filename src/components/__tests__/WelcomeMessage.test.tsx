import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import WelcomeMessage from '../../../components/WelcomeMessage';

describe('WelcomeMessage', () => {
  it('renders welcome title and content', () => {
    render(<WelcomeMessage textSize="medium" />);
    expect(screen.getByText(/ようこそ|welcome/i)).toBeInTheDocument();
    expect(screen.getByText(/こんにちは|hello/i)).toBeInTheDocument();
  });
}); 