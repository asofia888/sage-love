import { useCallback, useState } from 'react';
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
  const { t, i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  
  // 危機検出フックを統合
  const {
    checkForCrisis,
    checkMessageHistory,
    lastCrisisResult,
    isCrisisModalOpen,
    closeCrisisModal,
    getCrisisGuidance
  } = useCrisisDetection({
    enabled: true,
    checkHistoryLength: 5,
    autoShowModal: true
  });

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (isLoading) return;
    setError(null);

    // 危機検出チェック
    const crisisResult = checkForCrisis(userInput);
    
    // ユーザーメッセージを作成
    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: userInput,
      sender: MessageSender.USER,
      timestamp: new Date(),
    };
    
    // API呼び出し用の履歴をキャプチャ（新しいメッセージ追加前）
    const historyForApi = [...messages];

    // AIプレースホルダーメッセージを作成
    const aiMessageId = `ai-response-${Date.now()}`;
    const aiPlaceholderMessage: ChatMessage = {
        id: aiMessageId,
        text: '',
        sender: MessageSender.AI,
        timestamp: new Date(),
        isTyping: true,
    };
    
    // メッセージリストを更新
    setMessages(prev => [...prev, newUserMessage, aiPlaceholderMessage]);
    setIsLoading(true);

    try {
        // システムプロンプトに重複回避指示を追加
        let baseSystemInstruction = t('systemInstructionForSage');
        const duplicateAvoidancePrompt = DuplicateAvoidanceService.generateDuplicateAvoidancePrompt(historyForApi);
        
        // 危機が検出された場合はシステムプロンプトを調整
        if (crisisResult.isCrisis) {
          const crisisGuidance = getCrisisGuidance(crisisResult);
          baseSystemInstruction += `\n\n【重要な注意】ユーザーは現在困難な状況にある可能性があります。以下のガイダンスを参考に、共感的で支援的な応答を心がけてください：\n${crisisGuidance}\n\nまた、専門的な支援を受けることの重要性を優しく伝えてください。`;
        }
        
        const enhancedSystemInstruction = baseSystemInstruction + duplicateAvoidancePrompt;
        
        // 現在の言語を取得
        const currentLang = i18n.language.split('-')[0];
        
        // ストリーミングレスポンスを取得
        const stream = geminiService.streamChatWithTranslation(
            userInput, 
            historyForApi, 
            enhancedSystemInstruction,
            currentLang
        );
        
        // ストリーミングレスポンスを処理
        let fullText = '';
        for await (const chunk of stream) {
            fullText += chunk;
            setMessages(prev => 
                prev.map(m => m.id === aiMessageId ? { ...m, text: fullText } : m)
            );
        }

        // 応答完了後に多様性を評価
        const aiResponses = historyForApi
            .filter(msg => msg.sender === 'ai' && !msg.isTyping)
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

    } catch (e: any) {
        const apiError = ErrorService.normalizeError(e);
        ErrorService.logError(apiError, 'message-handler');
        setError(apiError);
        // エラー時はプレースホルダーを削除
        setMessages(prev => prev.filter(m => m.id !== aiMessageId));
    } finally {
        // ストリーミング完了後、typing状態を解除
        setMessages(prev => 
            prev.map(m => m.id === aiMessageId ? { ...m, isTyping: false } : m)
        );
        setIsLoading(false);
    }
  }, [messages, isLoading, t, i18n.language, setMessages]);

  return {
    handleSendMessage,
    isLoading,
    error,
    setError,
    // 危機検出関連
    isCrisisModalOpen,
    closeCrisisModal,
    lastCrisisResult
  };
};