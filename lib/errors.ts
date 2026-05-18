// lib/errors.ts
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode: number = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT_ERROR', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

export function handleError(error: unknown): { message: string; code: string; statusCode: number } {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'VALIDATION_ERROR') {
    return {
      message: (error as any).message || 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    };
  }
  
  if (error && typeof error === 'object' && 'code' in error && error.code === 'AUTHENTICATION_ERROR') {
    return {
      message: (error as any).message || 'Authentication failed',
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
    };
  }
  
  if (error && typeof error === 'object' && 'code' in error && error.code === 'CONFLICT_ERROR') {
    return {
      message: (error as any).message || 'Conflict occurred',
      code: 'CONFLICT_ERROR',
      statusCode: 409,
    };
  }

  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }

  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
}

export function createErrorResponse(error: unknown): Response {
  const { message, code, statusCode } = handleError(error);
  return new Response(
    JSON.stringify({
      success: false,
      error: { message, code },
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}