import { ErrorReport, ErrorDetails, ErrorInfo, ErrorCategory, ErrorSeverity, ErrorReportingConfig } from '../types/error';

class ErrorReportingService {
  private config: ErrorReportingConfig;
  private reportQueue: ErrorReport[] = [];
  private isReporting = false;

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      maxRetries: 3,
      retryDelay: 1000,
      includeStackTrace: true,
      includeBrowserInfo: true,
      includeUserInfo: false,
      ...config
    };
  }

  async reportError(
    error: Error,
    errorInfo?: ErrorInfo,
    context?: {
      route?: string;
      feature?: string;
      userAction?: string;
    }
  ): Promise<void> {
    if (!this.config.enabled) {
      console.warn('Error reporting is disabled');
      return;
    }

    const errorReport = this.createErrorReport(error, errorInfo, context);
    
    // 開発環境では詳細をコンソールに出力
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Report');
      console.error('Error:', error);
      console.info('Error Info:', errorInfo);
      console.info('Context:', context);
      console.info('Report:', errorReport);
      console.groupEnd();
    }

    this.reportQueue.push(errorReport);
    await this.processReportQueue();
  }

  private createErrorReport(
    error: Error,
    errorInfo?: ErrorInfo,
    context?: {
      route?: string;
      feature?: string;
      userAction?: string;
    }
  ): ErrorReport {
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: this.config.includeStackTrace ? error.stack : undefined,
      name: error.name,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId(),
      component: this.extractComponentFromStack(errorInfo?.componentStack)
    };

    const severity = this.determineSeverity(error, errorInfo);
    const category = this.categorizeError(error, errorInfo);

    return {
      id: this.generateErrorId(),
      error: errorDetails,
      errorInfo,
      severity,
      category,
      context: {
        route: context?.route || window.location.pathname,
        feature: context?.feature || 'unknown',
        userAction: context?.userAction
      },
      metadata: {
        environment: process.env.NODE_ENV as 'development' | 'production',
        deviceInfo: this.getDeviceInfo()
      }
    };
  }

  private determineSeverity(error: Error, errorInfo?: ErrorInfo): ErrorSeverity {
    // メモリ関連エラー
    if (error.message.includes('out of memory') || error.name === 'RangeError') {
      return 'critical';
    }

    // ネットワーク関連エラー
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'medium';
    }

    // チャンク読み込み失敗（通常は一時的）
    if (error.message.includes('Loading chunk')) {
      return 'low';
    }

    // コンポーネントのレンダリングエラー
    if (errorInfo?.componentStack) {
      return 'high';
    }

    return 'medium';
  }

  private categorizeError(error: Error, errorInfo?: ErrorInfo): ErrorCategory {
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'network_error';
    }

    if (error.message.includes('Loading chunk')) {
      return 'component_error';
    }

    if (error.message.includes('out of memory')) {
      return 'memory_error';
    }

    if (error.message.includes('permission') || error.message.includes('denied')) {
      return 'permission_error';
    }

    if (errorInfo?.componentStack) {
      return 'rendering_error';
    }

    if (error.message.includes('API') || error.message.includes('400') || error.message.includes('500')) {
      return 'api_error';
    }

    return 'unknown_error';
  }

  private extractComponentFromStack(componentStack?: string): string | undefined {
    if (!componentStack) return undefined;
    
    const match = componentStack.match(/in (\w+)/);
    return match ? match[1] : undefined;
  }

  private getDeviceInfo() {
    const ua = navigator.userAgent;
    return {
      platform: navigator.platform,
      browser: this.getBrowserName(ua),
      version: this.getBrowserVersion(ua),
      mobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    };
  }

  private getBrowserName(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getBrowserVersion(userAgent: string): string {
    const match = userAgent.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+\.\d+)/);
    return match ? match[1] : 'Unknown';
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error-session-id');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('error-session-id', sessionId);
    }
    return sessionId;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private async processReportQueue(): Promise<void> {
    if (this.isReporting || this.reportQueue.length === 0) {
      return;
    }

    this.isReporting = true;

    while (this.reportQueue.length > 0) {
      const report = this.reportQueue.shift()!;
      await this.sendReport(report);
    }

    this.isReporting = false;
  }

  private async sendReport(report: ErrorReport): Promise<void> {
    if (!this.config.endpoint) {
      // エンドポイントが設定されていない場合は、ローカルストレージに保存
      this.saveReportLocally(report);
      return;
    }

    let retries = 0;
    while (retries < this.config.maxRetries) {
      try {
        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(report)
        });

        if (response.ok) {
          console.log(`Error report sent successfully: ${report.id}`);
          return;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        retries++;
        console.warn(`Failed to send error report (attempt ${retries}/${this.config.maxRetries}):`, error);
        
        if (retries < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * retries);
        } else {
          // 最大試行回数に達した場合はローカルに保存
          this.saveReportLocally(report);
        }
      }
    }
  }

  private saveReportLocally(report: ErrorReport): void {
    try {
      const existingReports = JSON.parse(localStorage.getItem('error-reports') || '[]');
      existingReports.push(report);
      
      // 最大50件まで保存
      if (existingReports.length > 50) {
        existingReports.shift();
      }
      
      localStorage.setItem('error-reports', JSON.stringify(existingReports));
      console.log(`Error report saved locally: ${report.id}`);
    } catch (error) {
      console.error('Failed to save error report locally:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 設定更新メソッド
  updateConfig(newConfig: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // 手動でローカルレポートを取得
  getLocalReports(): ErrorReport[] {
    try {
      return JSON.parse(localStorage.getItem('error-reports') || '[]');
    } catch {
      return [];
    }
  }

  // ローカルレポートをクリア
  clearLocalReports(): void {
    localStorage.removeItem('error-reports');
  }
}

// シングルトンインスタンス
export const errorReportingService = new ErrorReportingService();

export default ErrorReportingService;