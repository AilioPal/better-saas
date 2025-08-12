import logger, { createChildLogger } from './logger';

export enum LogLevel {
  FATAL = 'fatal',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  sessionId?: string;
  action?: string;
  resource?: string;
  [key: string]: unknown;
}

export class PerformanceLogger {
  private startTime: number;
  private logger: ReturnType<typeof createChildLogger>;

  constructor(operation: string, context?: LogContext) {
    this.startTime = Date.now();
    this.logger = createChildLogger('performance');

    this.logger.info(
      {
        operation,
        ...context,
        event: 'start',
      },
      `start ${operation}`
    );
  }

  end(additionalContext?: LogContext) {
    const duration = Date.now() - this.startTime;

    this.logger.info(
      {
        duration,
        ...additionalContext,
        event: 'end',
      },
      `end,total time: ${duration}ms`
    );

    return duration;
  }
}

export class ErrorLogger {
  private logger: ReturnType<typeof createChildLogger>;

  constructor(service: string) {
    this.logger = createChildLogger(service);
  }

  logError(error: Error, context?: LogContext) {
    this.logger.error(
      {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        ...context,
      },
      `error: ${error.message}`
    );
  }

  logApiError(
    error: Error,
    request?: {
      method?: string;
      url?: string;
      headers?: Record<string, string>;
      body?: unknown;
    },
    context?: LogContext
  ) {
    this.logger.error(
      {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        request,
        ...context,
      },
      `api error: ${error.message}`
    );
  }
}

export const logUtils = {
  startPerformanceLog: (operation: string, context?: LogContext) => {
    return new PerformanceLogger(operation, context);
  },

  createErrorLogger: (service: string) => {
    return new ErrorLogger(service);
  },

  logApiCall: (
    method: string,
    url: string,
    duration: number,
    status: number,
    context?: LogContext
  ) => {
    const apiLogger = createChildLogger('api');
    apiLogger.info(
      {
        method,
        url,
        duration,
        status,
        ...context,
        type: 'api_call',
      },
      `api call: ${method} ${url} - ${status} (${duration}ms)`
    );
  },

  // 快速记录数据库操作
  logDbOperation: (operation: string, table: string, duration: number, context?: LogContext) => {
    const dbLogger = createChildLogger('database');
    dbLogger.info(
      {
        operation,
        table,
        duration,
        ...context,
        type: 'db_operation',
      },
      `db operation: ${operation} on ${table} (${duration}ms)`
    );
  },

  // 记录安全事件
  logSecurityEvent: (
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext
  ) => {
    const securityLogger = createChildLogger('security');
    const logMethod =
      severity === 'critical'
        ? 'fatal'
        : severity === 'high'
          ? 'error'
          : severity === 'medium'
            ? 'warn'
            : 'info';

    securityLogger[logMethod](
      {
        event,
        severity,
        ...context,
        type: 'security_event',
      },
      `security event: ${event} [${severity.toUpperCase()}]`
    );
  },
};

export { logger as default };
