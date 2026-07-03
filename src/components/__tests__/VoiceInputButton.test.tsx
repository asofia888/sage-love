import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../test/utils';
import VoiceInputButton from '../VoiceInputButton';

type SpeechRecognitionConstructor = Window['SpeechRecognition'] | undefined;

describe('VoiceInputButton', () => {
  let originalSR: SpeechRecognitionConstructor;
  let originalWebkitSR: SpeechRecognitionConstructor;

  beforeEach(() => {
    originalSR = window.SpeechRecognition;
    originalWebkitSR = window.webkitSpeechRecognition;
  });

  afterEach(() => {
    Object.assign(window, {
      SpeechRecognition: originalSR,
      webkitSpeechRecognition: originalWebkitSR,
    });
  });

  it('renders nothing when browser speech recognition is not supported', () => {
    Object.assign(window, {
      SpeechRecognition: undefined,
      webkitSpeechRecognition: undefined,
    });

    const { container } = render(<VoiceInputButton onTranscript={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders button when speech recognition is supported', () => {
    render(<VoiceInputButton onTranscript={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
