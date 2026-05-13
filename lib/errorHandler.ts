// lib/errorHandler.ts
import { ZodError } from 'zod';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from './errors';
import { logger } from './logger';

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

export function handleError(error: unknown, context?: string): ErrorResponse {
  const timestamp = new Date().toISOString();

  if (context) {
    logger.error(`[${context}] Error:`, error);
  } else {
    logger.error('Error:', error);
  }

  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.errors) {
      const path = issue.path.join('.');
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }

    return {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
        timestamp,
      },
    };
  }

  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
        timestamp,
      },
    };
  }

  if (error instanceof ValidationError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: 'VALIDATION_ERROR',
        timestamp,
      },
    };
  }

  if (error instanceof AuthenticationError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: 'AUTHENTICATION_ERROR',
        timestamp,
      },
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: 'AUTHORIZATION_ERROR',
        timestamp,
      },
    };
  }

  if (error instanceof NotFoundError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: 'NOT_FOUND',
        timestamp,
      },
    };
  }

  if (error instanceof ConflictError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: 'CONFLICT_ERROR',
        timestamp,
      },
    };
  }

  if (error instanceof RateLimitError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: 'RATE_LIMIT_ERROR',
        timestamp,
      },
    };
  }

  if (error instanceof Error && error.message.includes('fetch')) {
    return {
      success: false,
      error: {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        timestamp,
      },
    };
  }

  return {
    success: false,
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      timestamp,
    },
  };
}

export function createErrorResponse(error: unknown, status?: number): Response {
  const { error: errorInfo } = handleError(error);

  let statusCode = status || 500;
  if (errorInfo.code === 'VALIDATION_ERROR') statusCode = 400;
  if (errorInfo.code === 'AUTHENTICATION_ERROR') statusCode = 401;
  if (errorInfo.code === 'AUTHORIZATION_ERROR') statusCode = 403;
  if (errorInfo.code === 'NOT_FOUND') statusCode = 404;
  if (errorInfo.code === 'CONFLICT_ERROR') statusCode = 409;
  if (errorInfo.code === 'RATE_LIMIT_ERROR') statusCode = 429;

  return new Response(JSON.stringify({ success: false, error: errorInfo }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.statusCode < 500;
  }
  return false;
}
