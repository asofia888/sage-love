import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import VoiceInputButton from '../../../components/VoiceInputButton';

describe('VoiceInputButton', () => {
  it('renders nothing if not supported', () => {
    // SpeechRecognitionServiceのisSupportedをモック
    vi.mock('../../../services/speechRecognitionService', () => ({
      SpeechRecognitionService: vi.fn(() => ({
        isSupported: () => false,
        setLanguage: vi.fn(),
        requestPermission: vi.fn(),
        startListening: vi.fn(),
        stopListening: vi.fn(),
      }))
    }));
    const { container } = render(<VoiceInputButton onTranscript={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders button if supported', () => {
    vi.mock('../../../services/speechRecognitionService', () => ({
      SpeechRecognitionService: vi.fn(() => ({
        isSupported: () => true,
        setLanguage: vi.fn(),
        requestPermission: vi.fn(() => Promise.resolve(true)),
        startListening: vi.fn(),
        stopListening: vi.fn(),
      }))
    }));
    render(<VoiceInputButton onTranscript={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
}); 