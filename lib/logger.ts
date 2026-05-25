// lib/logger.ts
// Structured logger - NO console.log in production per Section 2D

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development'
  private isProd = process.env.NODE_ENV === 'production'

  private sanitize(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined
    
    // Remove sensitive data per Section 2D
    const sensitive = ['password', 'token', 'key', 'secret', 'id_number', 'sa_id', 'phone']
    const sanitized = { ...context }
    
    for (const field of sensitive) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    }
    
    return sanitized
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (this.isProd && level === 'debug') return
    
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.sanitize(context),
    }
    
    if (this.isDev) {
      const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
      console[method](JSON.stringify(entry, null, 2))
    }
    
    // In production, this would send to a logging service
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context)
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context)
  }
}

export const logger = new Logger()