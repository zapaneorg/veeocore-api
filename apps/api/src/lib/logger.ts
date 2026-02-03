/**
 * Logger structuré - Logging professionnel pour l'API
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  tenantId?: string;
  requestId?: string;
  duration?: number;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatLog(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }
  
  const { timestamp, level, message, ...rest } = entry;
  const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
  const color = {
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m'
  }[level];
  
  return `${color}[${level.toUpperCase()}]\x1b[0m ${timestamp} - ${message}${extra}`;
}

function log(level: LogLevel, message: string, meta: Record<string, unknown> = {}): void {
  if (!shouldLog(level)) return;
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'veeocore-api',
    ...meta
  };
  
  const output = formatLog(entry);
  
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
  
  // Log de requête API
  request: (req: { method: string; path: string; tenantId?: string }, duration: number, statusCode: number) => {
    log('info', `${req.method} ${req.path}`, {
      tenantId: req.tenantId,
      duration,
      statusCode
    });
  },
  
  // Log d'événement métier
  event: (eventName: string, data: Record<string, unknown>) => {
    log('info', `EVENT: ${eventName}`, data);
  }
};

export default logger;
