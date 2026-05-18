// lib/apiClient.ts
import { logger } from './logger';

export interface ApiClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface PendingRequest {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
}

class ApiClient {
  private baseURL: string;
  private defaultTimeout: number = 30000;
  private defaultRetries: number = 3;
  private defaultRetryDelay: number = 1000;
  private pendingRequests: Map<string, PendingRequest> = new Map();

  constructor(baseURL: string = process.env.NEXT_PUBLIC_APP_URL || '') {
    this.baseURL = baseURL;
  }

  private generateRequestKey(url: string, options: RequestInit): string {
    return `${options.method || 'GET'}:${url}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRetryableError(error: Error): boolean {
    const retryableMessages = ['fetch', 'network', 'timeout', 'ECONNRESET', 'ETIMEDOUT'];
    return retryableMessages.some(msg => error.message.toLowerCase().includes(msg));
  }

  private async requestWithRetry<T>(
    url: string,
    options: RequestInit,
    retriesLeft: number,
    retryDelay: number
  ): Promise<T> {
    try {
      return await this.executeRequest<T>(url, options);
    } catch (error) {
      const isRetryable = this.isRetryableError(error as Error);
      
      if (isRetryable && retriesLeft > 0) {
        logger.warn(`Request failed, retrying... (${retriesLeft} attempts left)`, error);
        await this.delay(retryDelay);
        return this.requestWithRetry<T>(url, options, retriesLeft - 1, retryDelay * 2);
      }
      
      throw error;
    }
  }

  private async executeRequest<T>(url: string, options: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);
    const requestKey = this.generateRequestKey(url, options);

    // Store pending request for potential cancellation
    this.pendingRequests.set(requestKey, { controller, timeoutId });

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      this.pendingRequests.delete(requestKey);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Request failed: ${response.status}`);
      }

      return data.data;
    } catch (error) {
      clearTimeout(timeoutId);
      this.pendingRequests.delete(requestKey);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    clientOptions?: ApiClientOptions
  ): Promise<T> {
    const url = `${this.baseURL}/api${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const requestOptions = {
      ...options,
      headers,
    };

    const retries = clientOptions?.retries ?? this.defaultRetries;
    const retryDelay = clientOptions?.retryDelay ?? this.defaultRetryDelay;

    try {
      return await this.requestWithRetry<T>(url, requestOptions, retries, retryDelay);
    } catch (error) {
      logger.error(`API Request failed: ${url}`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, options);
  }

  async post<T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }, options);
  }

  async put<T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }, options);
  }

  async patch<T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }, options);
  }

  async delete<T>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, options);
  }

  /**
   * Cancel a pending request by URL and method
   */
  cancelRequest(endpoint: string, method: string = 'GET'): void {
    const url = `${this.baseURL}/api${endpoint}`;
    const requestKey = `${method}:${url}`;
    const pending = this.pendingRequests.get(requestKey);
    
    if (pending) {
      pending.controller.abort();
      clearTimeout(pending.timeoutId);
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.pendingRequests.forEach((pending, key) => {
      pending.controller.abort();
      clearTimeout(pending.timeoutId);
      this.pendingRequests.delete(key);
    });
  }

  /**
   * Set default timeout for all requests
   */
  setTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  /**
   * Set default retry configuration
   */
  setRetryConfig(retries: number, retryDelay: number): void {
    this.defaultRetries = retries;
    this.defaultRetryDelay = retryDelay;
  }
}

export const apiClient = new ApiClient();