import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CrisisDetectionService, CrisisDetectionResult } from '../services/crisisDetectionService';
import { ChatMessage } from '../types';

interface UseCrisisDetectionOptions {
  enabled?: boolean;
  checkHistoryLength?: number; // 履歴をチェックするメッセージ数
  autoShowModal?: boolean; // 自動的にモーダルを表示するか
}

interface UseCrisisDetectionReturn {
  checkForCrisis: (message: string) => CrisisDetectionResult;
  checkMessageHistory: (messages: ChatMessage[]) => CrisisDetectionResult;
  lastCrisisResult: CrisisDetectionResult | null;
  crisisHistory: CrisisDetectionResult[];
  isCrisisModalOpen: boolean;
  openCrisisModal: () => void;
  closeCrisisModal: () => void;
  resetCrisisHistory: () => void;
  getCrisisGuidance: (result: CrisisDetectionResult) => string;
}

/**
 * 危機検出機能を提供するカスタムフック
 */
export const useCrisisDetection = (
  options: UseCrisisDetectionOptions = {}
): UseCrisisDetectionReturn => {
  const { 
    enabled = true, 
    checkHistoryLength = 5,
    autoShowModal = true 
  } = options;
  
  const { i18n } = useTranslation();
  const [lastCrisisResult, setLastCrisisResult] = useState<CrisisDetectionResult | null>(null);
  const [crisisHistory, setCrisisHistory] = useState<CrisisDetectionResult[]>([]);
  const [isCrisisModalOpen, setIsCrisisModalOpen] = useState(false);
  
  // 最近の危機検出を追跡（重複通知を防ぐため）
  const recentCrisisRef = useRef<{ timestamp: number; severity: string } | null>(null);

  /**
   * 単一メッセージの危機検出
   */
  const checkForCrisis = useCallback((message: string): CrisisDetectionResult => {
    if (!enabled || !message.trim()) {
      return {
        isCrisis: false,
        severity: 'low',
        detectedKeywords: [],
        triggerPatterns: [],
        recommendedAction: 'monitor'
      };
    }

    const result = CrisisDetectionService.detectCrisis(message, i18n.language);
    
    if (result.isCrisis) {
      setLastCrisisResult(result);
      setCrisisHistory(prev => [...prev.slice(-9), result]); // 最新10件を保持
      
      // 重複通知を防ぐ（5分以内の同じ重要度は無視）
      const now = Date.now();
      const shouldNotify = !recentCrisisRef.current || 
        (now - recentCrisisRef.current.timestamp > 5 * 60 * 1000) ||
        (result.severity !== recentCrisisRef.current.severity);
      
      if (shouldNotify && autoShowModal) {
        recentCrisisRef.current = { timestamp: now, severity: result.severity };
        
        // 重要度が高い場合は即座にモーダル表示
        if (result.severity === 'critical' || result.severity === 'high') {
          setIsCrisisModalOpen(true);
        }
      }
    }
    
    return result;
  }, [enabled, i18n.language, autoShowModal]);

  /**
   * メッセージ履歴から危機パターンを検出
   */
  const checkMessageHistory = useCallback((messages: ChatMessage[]): CrisisDetectionResult => {
    if (!enabled || messages.length === 0) {
      return {
        isCrisis: false,
        severity: 'low',
        detectedKeywords: [],
        triggerPatterns: [],
        recommendedAction: 'monitor'
      };
    }

    // 最近のユーザーメッセージのみをチェック
    const recentUserMessages = messages
      .filter(msg => msg.sender === 'user')
      .slice(-checkHistoryLength)
      .map(msg => msg.text);

    if (recentUserMessages.length === 0) {
      return {
        isCrisis: false,
        severity: 'low',
        detectedKeywords: [],
        triggerPatterns: [],
        recommendedAction: 'monitor'
      };
    }

    const result = CrisisDetectionService.detectCrisisPattern(recentUserMessages, i18n.language);
    
    if (result.isCrisis) {
      setLastCrisisResult(result);
      setCrisisHistory(prev => [...prev.slice(-9), result]);
      
      // パターン検出の場合は即座にモーダル表示
      if (autoShowModal && (result.severity === 'critical' || result.severity === 'high')) {
        setIsCrisisModalOpen(true);
      }
    }
    
    return result;
  }, [enabled, checkHistoryLength, i18n.language, autoShowModal]);

  /**
   * 危機検出結果に基づくガイダンス生成
   */
  const getCrisisGuidance = useCallback((result: CrisisDetectionResult): string => {
    return CrisisDetectionService.generateCrisisResponse(result, i18n.language);
  }, [i18n.language]);

  /**
   * モーダル表示制御
   */
  const openCrisisModal = useCallback(() => {
    setIsCrisisModalOpen(true);
  }, []);

  const closeCrisisModal = useCallback(() => {
    setIsCrisisModalOpen(false);
  }, []);

  /**
   * 危機履歴をリセット
   */
  const resetCrisisHistory = useCallback(() => {
    setCrisisHistory([]);
    setLastCrisisResult(null);
    recentCrisisRef.current = null;
  }, []);

  return {
    checkForCrisis,
    checkMessageHistory,
    lastCrisisResult,
    crisisHistory,
    isCrisisModalOpen,
    openCrisisModal,
    closeCrisisModal,
    resetCrisisHistory,
    getCrisisGuidance
  };
};