import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CrisisDetectionService, CrisisDetectionResult } from '../services/crisisDetectionService';
import { ChatMessage } from '../types';

interface UseCrisisDetectionOptions {
  enabled?: boolean;
  checkHistoryLength?: number; // 履歴をチェックするメッセージ数
  autoShowModal?: boolean; // 自動的にモーダルを表示するか
  maxModalsPerSession?: number; // セッション内最大表示回数
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
// 重要度別設定
const CRISIS_MODAL_SETTINGS = {
  critical: {
    showDelay: 0,           // 即座表示
    cooldown: 2 * 60 * 1000, // 2分
    maxPerSession: 10       // 緊急時は制限緩和
  },
  high: {
    showDelay: 3000,        // 3秒後表示
    cooldown: 10 * 60 * 1000, // 10分
    maxPerSession: 3
  },
  medium: {
    showDelay: 8000,        // 8秒後表示
    cooldown: 20 * 60 * 1000, // 20分
    maxPerSession: 2
  },
  low: {
    showDelay: 0,           // 表示しない
    cooldown: 30 * 60 * 1000, // 30分
    maxPerSession: 1
  }
} as const;

export const useCrisisDetection = (
  options: UseCrisisDetectionOptions = {}
): UseCrisisDetectionReturn => {
  const { 
    enabled = true, 
    checkHistoryLength = 5,
    autoShowModal = true,
    maxModalsPerSession = 4
  } = options;
  
  const { i18n } = useTranslation();
  const [lastCrisisResult, setLastCrisisResult] = useState<CrisisDetectionResult | null>(null);
  const [crisisHistory, setCrisisHistory] = useState<CrisisDetectionResult[]>([]);
  const [isCrisisModalOpen, setIsCrisisModalOpen] = useState(false);
  
  // セッション内モーダル表示回数追跡
  const sessionModalCountRef = useRef(0);
  
  // 最近の危機検出を追跡（重複通知を防ぐため）
  const recentCrisisRef = useRef<{ timestamp: number; severity: string } | null>(null);
  
  // 遅延表示タイマー
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      
      // 設定を取得
      const settings = CRISIS_MODAL_SETTINGS[result.severity as keyof typeof CRISIS_MODAL_SETTINGS];
      const now = Date.now();
      
      // 重複通知を防ぐ（重要度別クールダウン時間）
      const shouldNotify = !recentCrisisRef.current || 
        (now - recentCrisisRef.current.timestamp > settings.cooldown) ||
        (result.severity !== recentCrisisRef.current.severity && result.severity === 'critical');
      
      // セッション内表示回数制限
      const withinSessionLimit = sessionModalCountRef.current < Math.min(settings.maxPerSession, maxModalsPerSession);
      
      if (shouldNotify && autoShowModal && withinSessionLimit) {
        recentCrisisRef.current = { timestamp: now, severity: result.severity };
        
        // 既存のタイマーをクリア
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
        }
        
        // 重要度に応じた遅延表示
        if (settings.showDelay > 0) {
          delayTimerRef.current = setTimeout(() => {
            setIsCrisisModalOpen(true);
            sessionModalCountRef.current += 1;
          }, settings.showDelay);
        } else if (result.severity === 'critical') {
          // 緊急時は即座表示
          setIsCrisisModalOpen(true);
          sessionModalCountRef.current += 1;
        }
      }
    }
    
    return result;
  }, [enabled, i18n.language, autoShowModal, maxModalsPerSession]);

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
      
      // 設定を取得
      const settings = CRISIS_MODAL_SETTINGS[result.severity as keyof typeof CRISIS_MODAL_SETTINGS];
      const withinSessionLimit = sessionModalCountRef.current < Math.min(settings.maxPerSession, maxModalsPerSession);
      
      // パターン検出の場合は遅延なしで表示（ただし制限内）
      if (autoShowModal && (result.severity === 'critical' || result.severity === 'high') && withinSessionLimit) {
        setIsCrisisModalOpen(true);
        sessionModalCountRef.current += 1;
      }
    }
    
    return result;
  }, [enabled, checkHistoryLength, i18n.language, autoShowModal, maxModalsPerSession]);

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
    sessionModalCountRef.current = 0;
    
    // タイマーもクリア
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
  }, []);

  // クリーンアップ
  React.useEffect(() => {
    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }
    };
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