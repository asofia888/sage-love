/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */

import { CircuitBreakerError } from './errors';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;      // Number of successes to close from half-open
  timeout: number;               // Time to wait before half-open (ms)
  monitoringPeriod: number;      // Time window for failure count (ms)
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastStateChange: Date;
  totalRequests: number;
  rejectedRequests: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
  monitoringPeriod: 120000, // 2 minutes
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private lastStateChange: Date = new Date();
  private totalRequests: number = 0;
  private rejectedRequests: number = 0;
  private config: CircuitBreakerConfig;
  private nextAttempt?: Date;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        console.log('Circuit breaker: Transitioning to HALF_OPEN state');
      } else {
        this.rejectedRequests++;
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN. Service unavailable until ${this.nextAttempt?.toISOString()}`,
          {
            state: this.state,
            failureCount: this.failureCount,
            nextAttempt: this.nextAttempt?.toISOString(),
          }
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.lastStateChange = new Date();
        console.log('Circuit breaker: Transitioning to CLOSED state');
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    // Remove old failures outside monitoring period
    const now = Date.now();
    if (this.lastFailureTime &&
        now - this.lastFailureTime.getTime() > this.config.monitoringPeriod) {
      this.failureCount = 1;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.open();
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.open();
    }
  }

  /**
   * Open the circuit
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    this.lastStateChange = new Date();
    this.nextAttempt = new Date(Date.now() + this.config.timeout);
    console.error(
      `Circuit breaker: Transitioning to OPEN state. Next attempt at ${this.nextAttempt.toISOString()}`
    );
  }

  /**
   * Check if we should attempt to reset
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttempt ? Date.now() >= this.nextAttempt.getTime() : false;
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      totalRequests: this.totalRequests,
      rejectedRequests: this.rejectedRequests,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.lastStateChange = new Date();
    this.nextAttempt = undefined;
    console.log('Circuit breaker: Manually reset to CLOSED state');
  }
}

// Global circuit breaker instance for Gemini API
export const geminiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
  monitoringPeriod: 120000, // 2 minutes
});
