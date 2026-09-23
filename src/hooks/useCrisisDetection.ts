import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CrisisDetectionService, CrisisDetectionResult } from '../services/crisisDetectionService';
import { CrisisSeverity } from '../data/crisisKeywords';
import { ChatMessage } from '../types';

interface UseCrisisDetectionOptions {
  enabled?: boolean;
  checkHistoryLength?: number; // 履歴をチェックするメッセージ数
  autoShowModal?: boolean; // 自動的にモーダルを表示するか
  maxModalsPerSession?: number; // critical を除く、セッション内の合計表示回数上限
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
    showDelay: 0,            // 即座表示
    cooldown: 2 * 60 * 1000, // 2分
    // critical は回数上限を適用しない（canShowModal を参照）。
    // 抑制は cooldown の 2 分のみで行う。
    maxPerSession: Infinity
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
  
  // セッション内モーダル表示回数追跡。
  // 深刻度ごとに独立して数える — 1本の共有カウンタだと、
  // 前半に出た medium/high のモーダルが枠を使い切ったせいで、
  // 後から来た critical で緊急窓口が一切出ない、という事故が起きる。
  const sessionModalCountsRef = useRef<Record<CrisisSeverity, number>>({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });

  // critical を除いた合計表示回数（maxModalsPerSession の対象）
  const nonCriticalModalTotalRef = useRef(0);
  
  // 最近の危機検出を追跡（重複通知を防ぐため）
  const recentCrisisRef = useRef<{ timestamp: number; severity: string } | null>(null);
  
  // 遅延表示タイマー
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * この深刻度のモーダルをまだ出してよいか。
   *
   * critical だけは回数上限を免除する。最も危険な場面で緊急窓口が出ないことの
   * 害は、モーダルが数回多く出ることの煩わしさより、はるかに大きい。
   * 連続表示は cooldown（critical は 2 分）が抑える。
   */
  const canShowModal = useCallback((severity: CrisisSeverity): boolean => {
    if (severity === 'critical') return true;

    const settings = CRISIS_MODAL_SETTINGS[severity];
    if (sessionModalCountsRef.current[severity] >= settings.maxPerSession) return false;
    return nonCriticalModalTotalRef.current < maxModalsPerSession;
  }, [maxModalsPerSession]);

  /** モーダルを開き、深刻度別の表示回数を記録する。 */
  const showModal = useCallback((severity: CrisisSeverity): void => {
    setIsCrisisModalOpen(true);
    sessionModalCountsRef.current[severity] += 1;
    if (severity !== 'critical') {
      nonCriticalModalTotalRef.current += 1;
    }
  }, []);

  /**
   * 直前の表示からクールダウンが明けているか。
   * ただし、より軽い深刻度から critical に上がった場合はクールダウンを待たない。
   */
  const isPastCooldown = useCallback((severity: CrisisSeverity): boolean => {
    const recent = recentCrisisRef.current;
    if (!recent) return true;
    if (severity === 'critical' && recent.severity !== 'critical') return true;
    return Date.now() - recent.timestamp > CRISIS_MODAL_SETTINGS[severity].cooldown;
  }, []);

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
      
      const settings = CRISIS_MODAL_SETTINGS[result.severity];
      const severity = result.severity;

      if (autoShowModal && isPastCooldown(severity) && canShowModal(severity)) {
        recentCrisisRef.current = { timestamp: Date.now(), severity };

        // 既存のタイマーをクリア
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
        }

        // 重要度に応じた遅延表示
        if (settings.showDelay > 0) {
          delayTimerRef.current = setTimeout(() => showModal(severity), settings.showDelay);
        } else if (severity === 'critical') {
          // 緊急時は即座表示
          showModal(severity);
        }
        // low は showDelay 0 かつ critical でないため、意図どおり表示しない
      }
    }
    
    return result;
  }, [enabled, i18n.language, autoShowModal, canShowModal, showModal, isPastCooldown]);

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
      
      const severity = result.severity;

      // パターン検出の場合は遅延なしで表示（ただしクールダウンと回数制限の範囲内）。
      // クールダウンを見ないと、悪化が続くあいだ毎ターン開き直すことになる。
      if (
        autoShowModal &&
        (severity === 'critical' || severity === 'high') &&
        isPastCooldown(severity) &&
        canShowModal(severity)
      ) {
        recentCrisisRef.current = { timestamp: Date.now(), severity };
        showModal(severity);
      }
    }
    
    return result;
  }, [enabled, checkHistoryLength, i18n.language, autoShowModal, canShowModal, showModal, isPastCooldown]);

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
    sessionModalCountsRef.current = { critical: 0, high: 0, medium: 0, low: 0 };
    nonCriticalModalTotalRef.current = 0;
    
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