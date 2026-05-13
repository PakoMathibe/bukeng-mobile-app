// modules/OfflineSync/retryLogic.ts
import { logger } from '@/lib/logger';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
};

export class RetryLogic {
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    onRetry?: (attempt: number, delayMs: number, error: Error) => void
  ): Promise<T> {
    const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === fullConfig.maxAttempts) {
          break;
        }

        const delayMs = Math.min(
          fullConfig.baseDelayMs *
            Math.pow(fullConfig.backoffFactor, attempt - 1),
          fullConfig.maxDelayMs
        );

        if (onRetry) {
          onRetry(attempt, delayMs, lastError);
        }

        logger.warn(
          `Retry attempt ${attempt} for operation after ${delayMs}ms`,
          { error: lastError.message }
        );
        await this.sleep(delayMs);
      }
    }

    throw lastError || new Error('Operation failed after max retries');
  }

  static isRetryableError(error: unknown): boolean {
    const errorMessage =
      error instanceof Error ? error.message.toLowerCase() : '';
    const retryablePatterns = [
      'network',
      'timeout',
      'connection',
      'econnreset',
      'etimedout',
      'econnrefused',
      'socket',
      'offline',
    ];

    return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
