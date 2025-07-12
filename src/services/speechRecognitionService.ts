// Web Speech API の型定義
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  grammars: SpeechGrammarList;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionError {
  type: 'not-supported' | 'permission-denied' | 'network-error' | 'no-speech' | 'aborted' | 'audio-capture' | 'unknown';
  message: string;
}

export type SpeechRecognitionCallback = (result: SpeechRecognitionResult) => void;
export type SpeechRecognitionErrorCallback = (error: SpeechRecognitionError) => void;

export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private currentLanguage = 'ja-JP';

  // 言語コードのマッピング
  private languageMap: Record<string, string> = {
    'ja': 'ja-JP',
    'en': 'en-US', 
    'es': 'es-ES',
    'zh': 'zh-CN',
    'ko': 'ko-KR',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-BR'
  };

  constructor() {
    this.initializeRecognition();
  }

  private initializeRecognition(): void {
    if (!this.isSupported()) {
      console.warn('Speech Recognition is not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.currentLanguage;
  }

  public isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public setLanguage(languageCode: string): void {
    const mappedLang = this.languageMap[languageCode] || this.languageMap['ja'];
    this.currentLanguage = mappedLang;
    
    if (this.recognition) {
      this.recognition.lang = this.currentLanguage;
    }
  }

  public async requestPermission(): Promise<boolean> {
    try {
      // マイクの許可を要求
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // すぐに停止
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  public startListening(
    onResult: SpeechRecognitionCallback,
    onError: SpeechRecognitionErrorCallback,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (!this.recognition || this.isListening) {
      return;
    }

    let interimTranscript = '';
    let finalTranscript = '';

    this.recognition.onstart = () => {
      this.isListening = true;
      onStart?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      interimTranscript = '';
      finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += transcript;
          onResult({
            transcript: finalTranscript.trim(),
            confidence,
            isFinal: true
          });
        } else {
          interimTranscript += transcript;
          onResult({
            transcript: interimTranscript.trim(),
            confidence,
            isFinal: false
          });
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isListening = false;
      
      let errorType: SpeechRecognitionError['type'] = 'unknown';
      let message = event.error;

      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          errorType = 'permission-denied';
          message = 'マイクへのアクセスが拒否されました。設定でマイクの許可を有効にしてください。';
          break;
        case 'no-speech':
          errorType = 'no-speech';
          message = '音声が検出されませんでした。もう一度お試しください。';
          break;
        case 'network':
          errorType = 'network-error';
          message = 'ネットワークエラーが発生しました。接続を確認してください。';
          break;
        case 'aborted':
          errorType = 'aborted';
          message = '音声認識が中断されました。';
          break;
        case 'audio-capture':
          errorType = 'audio-capture';
          message = 'マイクにアクセスできませんでした。';
          break;
        default:
          errorType = 'unknown';
          message = `音声認識エラー: ${event.error}`;
      }

      onError({ type: errorType, message });
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (error) {
      this.isListening = false;
      onError({
        type: 'unknown',
        message: '音声認識を開始できませんでした。'
      });
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  public abortListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.abort();
    }
  }

  // サポートされている言語の一覧を取得
  public getSupportedLanguages(): Array<{ code: string; name: string; speechCode: string }> {
    return [
      { code: 'ja', name: '日本語', speechCode: 'ja-JP' },
      { code: 'en', name: 'English', speechCode: 'en-US' },
      { code: 'es', name: 'Español', speechCode: 'es-ES' },
      { code: 'zh', name: '中文', speechCode: 'zh-CN' },
      { code: 'ko', name: '한국어', speechCode: 'ko-KR' },
      { code: 'fr', name: 'Français', speechCode: 'fr-FR' },
      { code: 'de', name: 'Deutsch', speechCode: 'de-DE' },
      { code: 'it', name: 'Italiano', speechCode: 'it-IT' },
      { code: 'pt', name: 'Português', speechCode: 'pt-BR' }
    ];
  }
}