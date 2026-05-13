// lib/apiClient.ts
import { logger } from './logger';
import { AppError, AuthenticationError } from './errorHandler';

interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_APP_URL || '') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}/api${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      logger.debug(`API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthenticationError(data.message || 'Session expired');
        }
        throw new AppError(
          data.message || 'Request failed',
          data.code || 'API_ERROR',
          response.status,
          data.details
        );
      }

      return {
        data: data.data,
        status: response.status,
        message: data.message,
      };
    } catch (error) {
      logger.error(`API Request failed: ${url}`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint, { method: 'GET' });
    return response.data;
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.data;
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.data;
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint, { method: 'DELETE' });
    return response.data;
  }

  async upload<T>(
    endpoint: string,
    file: File,
    fieldName: string = 'file'
  ): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const url = `${this.baseURL}/api${endpoint}`;
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new AppError(
        error.message || 'Upload failed',
        error.code || 'UPLOAD_ERROR',
        response.status
      );
    }

    const data = await response.json();
    return data.data;
  }
}

export const apiClient = new ApiClient();
