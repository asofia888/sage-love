import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '../../test/utils';
import { ClearChatButtonIcon, ShareIcon, LanguageSelectorIcon, TextSizeIcon } from '../../../components/icons/FeatureIcons';

describe('FeatureIcons', () => {
  it('renders ClearChatButtonIcon', () => {
    render(<ClearChatButtonIcon />);
  });
  it('renders ShareIcon', () => {
    render(<ShareIcon />);
  });
  it('renders LanguageSelectorIcon', () => {
    render(<LanguageSelectorIcon />);
  });
  it('renders TextSizeIcon', () => {
    render(<TextSizeIcon />);
  });
}); 