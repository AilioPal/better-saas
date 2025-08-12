// Detect runtime environment
const isCloudflareWorkers =
  typeof navigator !== 'undefined' && navigator.userAgent?.includes('Cloudflare-Workers');
const isVercelEdge = typeof (globalThis as Record<string, unknown>).EdgeRuntime !== 'undefined';
const isEdgeRuntime = isCloudflareWorkers || isVercelEdge;

// Simple logger interface, compatible with pino
interface SimpleLogger {
  info: (obj: Record<string, unknown> | string, msg?: string) => void;
  warn: (obj: Record<string, unknown> | string, msg?: string) => void;
  error: (obj: Record<string, unknown> | string, msg?: string) => void;
  debug: (obj: Record<string, unknown> | string, msg?: string) => void;
  trace: (obj: Record<string, unknown> | string, msg?: string) => void;
  fatal: (obj: Record<string, unknown> | string, msg?: string) => void;
  child: (obj: Record<string, unknown>) => SimpleLogger;
}

// Create a simple logger implementation for Edge Runtime
function createEdgeLogger(prefix = ''): SimpleLogger {
  const logWithPrefix = (level: string, obj: Record<string, unknown> | string, msg?: string) => {
    const timestamp = new Date().toISOString();
    const logObj = typeof obj === 'object' ? obj : { message: obj };
    const message = msg || logObj.message || '';
    const fullMessage = prefix ? `[${prefix}] ${message}` : message;

    const logData = {
      level,
      time: timestamp,
      ...logObj,
      msg: fullMessage,
    };

    // 使用对应的 console 方法
    switch (level) {
      case 'error':
      case 'fatal':
        console.error(JSON.stringify(logData));
        break;
      case 'warn':
        console.warn(JSON.stringify(logData));
        break;
      case 'debug':
      case 'trace':
        console.debug(JSON.stringify(logData));
        break;
      default:
        console.log(JSON.stringify(logData));
    }
  };

  return {
    info: (obj, msg) => logWithPrefix('info', obj, msg),
    warn: (obj, msg) => logWithPrefix('warn', obj, msg),
    error: (obj, msg) => logWithPrefix('error', obj, msg),
    debug: (obj, msg) => logWithPrefix('debug', obj, msg),
    trace: (obj, msg) => logWithPrefix('trace', obj, msg),
    fatal: (obj, msg) => logWithPrefix('fatal', obj, msg),
    child: (obj) =>
      createEdgeLogger(
        prefix
          ? `${prefix}:${(obj.service as string) || 'child'}`
          : (obj.service as string) || 'child'
      ),
  };
}

let logger: SimpleLogger | null = null;

// Initialize logger based on runtime
async function initializeLogger(): Promise<SimpleLogger> {
  if (isEdgeRuntime) {
    // Use simple logger for Edge Runtime
    return createEdgeLogger();
  } else {
    // Use pino in Node.js environment with dynamic import
    const { default: pino } = await import('pino');

    const pinoLogger = pino({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      ...(process.env.NODE_ENV === 'production' && {
        formatters: {
          level: (label: string) => {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
    });

    return pinoLogger as unknown as SimpleLogger;
  }
}

// Create a proxy logger that initializes on first use
const loggerProxy = new Proxy({} as SimpleLogger, {
  get(target, prop) {
    if (!logger) {
      // For synchronous initialization in edge runtime
      if (isEdgeRuntime) {
        logger = createEdgeLogger();
      } else {
        // Return a function that logs after initialization
        return (...args: unknown[]) => {
          initializeLogger().then((l) => {
            logger = l;
            const method = l[prop as keyof SimpleLogger];
            if (typeof method === 'function') {
              // Cast args to any[] to satisfy TypeScript
              (method as Function).apply(l, args as any[]);
            }
          });
        };
      }
    }

    return logger[prop as keyof SimpleLogger];
  },
});

export const createChildLogger = (name: string) => {
  if (!logger && isEdgeRuntime) {
    logger = createEdgeLogger();
  }

  if (!logger) {
    // Return a proxy that will initialize on first use
    return new Proxy({} as SimpleLogger, {
      get(target, prop) {
        return (...args: unknown[]) => {
          initializeLogger().then((l) => {
            logger = l;
            const child = l.child({ service: name });
            const method = child[prop as keyof SimpleLogger];
            if (typeof method === 'function') {
              (method as Function).apply(child, args as any[]);
            }
          });
        };
      },
    });
  }

  return logger.child({ service: name });
};

// Initialize logger immediately if possible
if (!isEdgeRuntime) {
  initializeLogger().then((l) => {
    logger = l;
  });
}

export default loggerProxy;
