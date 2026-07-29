/**
 * DAYAR-E-HABIB ERP — STRUCTURED LOGGING & ERROR CATEGORIZATION ENGINE
 */

export type ErrorCategory =
  | 'ValidationError'
  | 'DatabaseError'
  | 'FilesystemError'
  | 'BackupError'
  | 'MigrationError'
  | 'PrintError'
  | 'OcrError'
  | 'ConfigurationError'
  | 'UnknownError';

export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(category: ErrorCategory, message: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  subsystem: string;
  message: string;
  category?: ErrorCategory;
  details?: any;
}

class LoggerService {
  private logs: StructuredLog[] = [];
  private maxLogs = 500;

  private log(level: LogLevel, subsystem: string, message: string, category?: ErrorCategory, details?: any) {
    const entry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      subsystem,
      message,
      category,
      details,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const prefix = `[${entry.timestamp}] [${level}] [${subsystem}]`;
    if (level === 'ERROR') {
      console.error(`${prefix} ${message}`, details || '');
    } else if (level === 'WARN') {
      console.warn(`${prefix} ${message}`, details || '');
    } else {
      console.log(`${prefix} ${message}`, details || '');
    }
  }

  debug(subsystem: string, message: string, details?: any) {
    this.log('DEBUG', subsystem, message, undefined, details);
  }

  info(subsystem: string, message: string, details?: any) {
    this.log('INFO', subsystem, message, undefined, details);
  }

  warn(subsystem: string, message: string, details?: any) {
    this.log('WARN', subsystem, message, undefined, details);
  }

  error(subsystem: string, message: string, category: ErrorCategory = 'UnknownError', details?: any) {
    this.log('ERROR', subsystem, message, category, details);
  }

  getLogs(): StructuredLog[] {
    return [...this.logs];
  }
}

export const logger = new LoggerService();
