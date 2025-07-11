import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import TextSizeSelector from '../../../components/TextSizeSelector';

describe('TextSizeSelector', () => {
  it('renders all size options', () => {
    render(<TextSizeSelector value="medium" onChange={() => {}} />);
    expect(screen.getByLabelText(/小|small/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/中|medium/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/大|large/i)).toBeInTheDocument();
  });

  it('calls onChange when option is selected', () => {
    const onChange = vi.fn();
    render(<TextSizeSelector value="small" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/中|medium/i));
    expect(onChange).toHaveBeenCalledWith('medium');
  });
}); 