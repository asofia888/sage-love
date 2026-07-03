import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage, ApiError, MessageSender } from '../types';
import { CrisisDetectionResult } from '../services/crisisDetectionService';
import * as geminiService from '../services/geminiService';
import { DuplicateAvoidanceService } from '../services/duplicateAvoidanceService';
import { ErrorService } from '../services/errorService';
import { useCrisisDetection } from './useCrisisDetection';

interface UseMessageHandlerProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

interface UseMessageHandlerReturn {
  handleSendMessage: (userInput: string) => Promise<void>;
  stopStreaming: () => void;
  isLoading: boolean;
  error: ApiError | null;
  setError: React.Dispatch<React.SetStateAction<ApiError | null>>;
  // 危機検出関連
  isCrisisModalOpen: boolean;
  closeCrisisModal: () => void;
  lastCrisisResult: CrisisDetectionResult | null;
}

/**
 * メッセージ送信と受信を処理するカスタムフック
 */
export const useMessageHandler = ({ 
  messages, 
  setMessages 
}: UseMessageHandlerProps): UseMessageHandlerReturn => {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // アンマウント時に進行中のストリームを中断してリソースを解放する
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);
  
  // 危機検出フックを統合
  const {
    checkForCrisis,
    lastCrisisResult,
    isCrisisModalOpen,
    closeCrisisModal
  } = useCrisisDetection({
    enabled: true,
    checkHistoryLength: 5,
    autoShowModal: true
  });

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (isLoading) return;
    setError(null);

    // 危機検出チェック（モーダル表示用。プロンプトへの反映はサーバー側で行う）
    checkForCrisis(userInput);

    // ユーザーメッセージを作成
    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: userInput,
      sender: MessageSender.USER,
      timestamp: new Date().toISOString(),
    };
    
    // API呼び出し用の履歴をキャプチャ（新しいメッセージ追加前）
    const historyForApi = [...messages];

    // AIプレースホルダーメッセージを作成
    const aiMessageId = `ai-response-${Date.now()}`;
    const aiPlaceholderMessage: ChatMessage = {
        id: aiMessageId,
        text: '',
        sender: MessageSender.AI,
        timestamp: new Date().toISOString(),
        isTyping: true,
    };
    
    // メッセージリストを更新
    setMessages(prev => [...prev, newUserMessage, aiPlaceholderMessage]);
    setIsLoading(true);

    // 停止ボタン/アンマウントからの中断用
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // catch 節で部分応答を保持できるよう try の外で宣言する
    let fullText = '';

    try {
        // 現在の言語を取得（システムプロンプト・危機ガイダンス・重複回避指示は
        // すべてサーバー側で言語別に構築される）
        const currentLang = i18n.language.split('-')[0];

        // ストリーミングレスポンスを取得
        const stream = geminiService.streamChatWithTranslation(
            userInput,
            historyForApi,
            currentLang,
            abortController.signal
        );

        // ストリーミングレスポンスを処理
        for await (const chunk of stream) {
            fullText += chunk;
            setMessages(prev => 
                prev.map(m => m.id === aiMessageId ? { ...m, text: fullText } : m)
            );
        }

        // 応答完了後に多様性を評価
        const aiResponses = historyForApi
            .filter(msg => msg.sender === MessageSender.AI && !msg.isTyping)
            .map(msg => msg.text);
        
        const diversityEvaluation = DuplicateAvoidanceService.evaluateResponseDiversity(
            fullText, 
            aiResponses
        );

        // デバッグ情報をコンソールに出力
        if (diversityEvaluation.diversityScore < 0.5) {
            console.warn('応答の多様性が低い可能性があります:', {
                diversityScore: diversityEvaluation.diversityScore,
                suggestions: diversityEvaluation.suggestions
            });
        }

    } catch (e) {
        // ユーザーによる停止（またはアンマウント）はエラー扱いにしない。
        // 途中まで届いた応答は残し、1文字も無ければプレースホルダーを消す。
        if (abortController.signal.aborted) {
            if (!fullText.trim()) {
                setMessages(prev => prev.filter(m => m.id !== aiMessageId));
            }
        } else {
            const apiError = ErrorService.normalizeError(e);
            ErrorService.logError(apiError, 'message-handler');
            setError(apiError);
            // 途中までの応答が届いていればメッセージとして残し（エラーバナーのみ表示）、
            // 1文字も届いていない場合だけプレースホルダーを削除する
            if (!fullText.trim()) {
                setMessages(prev => prev.filter(m => m.id !== aiMessageId));
            }
        }
    } finally {
        // ストリーミング完了後、typing状態を解除
        setMessages(prev =>
            prev.map(m => m.id === aiMessageId ? { ...m, isTyping: false } : m)
        );
        setIsLoading(false);
        if (abortControllerRef.current === abortController) {
            abortControllerRef.current = null;
        }
    }
  }, [messages, isLoading, i18n.language, setMessages, checkForCrisis]);

  return {
    handleSendMessage,
    stopStreaming,
    isLoading,
    error,
    setError,
    // 危機検出関連
    isCrisisModalOpen,
    closeCrisisModal,
    lastCrisisResult
  };
};