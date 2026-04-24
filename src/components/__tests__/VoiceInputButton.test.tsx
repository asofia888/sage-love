import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../test/utils';
import VoiceInputButton from '../VoiceInputButton';

describe('VoiceInputButton', () => {
  let originalSR: any;
  let originalWebkitSR: any;

  beforeEach(() => {
    originalSR = window.SpeechRecognition;
    originalWebkitSR = (window as any).webkitSpeechRecognition;
  });

  afterEach(() => {
    (window as any).SpeechRecognition = originalSR;
    (window as any).webkitSpeechRecognition = originalWebkitSR;
  });

  it('renders nothing when browser speech recognition is not supported', () => {
    (window as any).SpeechRecognition = undefined;
    (window as any).webkitSpeechRecognition = undefined;

    const { container } = render(<VoiceInputButton onTranscript={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders button when speech recognition is supported', () => {
    render(<VoiceInputButton onTranscript={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
