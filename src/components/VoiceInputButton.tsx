import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  SpeechRecognitionService, 
  SpeechRecognitionResult, 
  SpeechRecognitionError 
} from '../services/speechRecognitionService';

interface VoiceInputButtonProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

// マイクアイコンコンポーネント
const MicrophoneIcon: React.FC<{ className?: string; isListening?: boolean }> = ({ 
  className = "w-5 h-5", 
  isListening = false 
}) => (
  <svg
    className={`${className} ${isListening ? 'animate-pulse' : ''}`}
    fill={isListening ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 10v2a7 7 0 0 1-14 0v-2"
    />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

// 音波アニメーションコンポーネント
const SoundWaveIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="2" y="8" width="2" height="8" className="animate-bounce" style={{ animationDelay: '0ms' }} />
    <rect x="6" y="6" width="2" height="12" className="animate-bounce" style={{ animationDelay: '150ms' }} />
    <rect x="10" y="4" width="2" height="16" className="animate-bounce" style={{ animationDelay: '300ms' }} />
    <rect x="14" y="6" width="2" height="12" className="animate-bounce" style={{ animationDelay: '450ms' }} />
    <rect x="18" y="8" width="2" height="8" className="animate-bounce" style={{ animationDelay: '600ms' }} />
  </svg>
);

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  onError,
  disabled = false,
  className = ""
}) => {
  const { t, i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [speechService] = useState(() => new SpeechRecognitionService());
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setIsSupported(speechService.isSupported());
    
    // 言語が変更されたときに音声認識の言語も更新
    const currentLang = i18n.language.split('-')[0];
    speechService.setLanguage(currentLang);
  }, [speechService, i18n.language]);

  const handleStartListening = async () => {
    if (!isSupported || disabled || isListening) return;

    // 初回の場合はマイク許可を要求
    if (permissionGranted === null) {
      const granted = await speechService.requestPermission();
      setPermissionGranted(granted);
      
      if (!granted) {
        onError?.('マイクへのアクセスが拒否されました。ブラウザの設定でマイクの許可を有効にしてください。');
        return;
      }
    }

    const handleResult = (result: SpeechRecognitionResult) => {
      onTranscript(result.transcript, result.isFinal);
    };

    const handleSpeechError = (error: SpeechRecognitionError) => {
      setIsListening(false);
      onError?.(error.message);
    };

    const handleStart = () => {
      setIsListening(true);
    };

    const handleEnd = () => {
      setIsListening(false);
    };

    speechService.startListening(handleResult, handleSpeechError, handleStart, handleEnd);
  };

  const handleStopListening = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 100);
  };

  if (!isSupported) {
    return null; // 対応していないブラウザでは表示しない
  }

  const buttonContent = isListening ? (
    <SoundWaveIcon className="w-5 h-5" />
  ) : (
    <MicrophoneIcon className="w-5 h-5" isListening={isListening} />
  );

  const getTooltipText = () => {
    if (permissionGranted === false) {
      return 'マイクへのアクセスが必要です';
    }
    if (isListening) {
      return '音声入力中 - クリックで停止';
    }
    return '音声入力を開始';
  };

  const getButtonClass = () => {
    const baseClass = `relative p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`;
    
    if (disabled) {
      return `${baseClass} bg-slate-600/50 text-slate-400 cursor-not-allowed`;
    }
    
    if (isListening) {
      return `${baseClass} bg-red-500/80 hover:bg-red-500 text-white shadow-lg`;
    }
    
    if (permissionGranted === false) {
      return `${baseClass} bg-yellow-500/80 hover:bg-yellow-500 text-white`;
    }
    
    return `${baseClass} bg-indigo-500/80 hover:bg-indigo-500 text-white shadow-md hover:shadow-lg`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={isListening ? handleStopListening : handleStartListening}
        disabled={disabled}
        className={getButtonClass()}
        aria-label={isListening ? '音声入力を停止' : '音声入力を開始'}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {buttonContent}
        {isListening && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 border-2 border-white rounded-full animate-ping" />
        )}
      </button>
      
      {/* ツールチップ */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-black/80 rounded whitespace-nowrap z-10">
          {getTooltipText()}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-black/80" />
        </div>
      )}
    </div>
  );
};

export default VoiceInputButton;