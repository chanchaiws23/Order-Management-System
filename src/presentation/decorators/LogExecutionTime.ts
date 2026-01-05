import { Request, Response, NextFunction, RequestHandler } from 'express';

export interface ExecutionLog {
  method: string;
  path: string;
  duration: number;
  timestamp: Date;
  statusCode?: number;
}

export type LoggerFunction = (log: ExecutionLog) => void;

const defaultLogger: LoggerFunction = (log) => {
  console.log(
    `[ExecutionTime] ${log.method} ${log.path} - ${log.duration}ms (${log.statusCode ?? 'N/A'})`
  );
};

export function LogExecutionTime(logger: LoggerFunction = defaultLogger) {
  return function (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
  ): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const startTime = performance.now();
      const method = req.method;
      const path = req.originalUrl || req.path;

      try {
        await handler(req, res, next);
      } finally {
        const endTime = performance.now();
        const duration = Math.round((endTime - startTime) * 100) / 100;

        logger({
          method,
          path,
          duration,
          timestamp: new Date(),
          statusCode: res.statusCode,
        });
      }
    };
  };
}

export function withExecutionLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string,
  logger: LoggerFunction = defaultLogger
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const startTime = performance.now();

    try {
      const result = await fn(...args);
      return result;
    } finally {
      const endTime = performance.now();
      const duration = Math.round((endTime - startTime) * 100) / 100;

      logger({
        method: 'OPERATION',
        path: operationName,
        duration,
        timestamp: new Date(),
      });
    }
  }) as T;
}

export class ExecutionTimeDecorator<T> {
  constructor(
    private readonly wrapped: T,
    private readonly logger: LoggerFunction = defaultLogger
  ) {}

  wrap<K extends keyof T>(
    methodName: K,
    customName?: string
  ): T[K] extends (...args: infer A) => Promise<infer R>
    ? (...args: A) => Promise<R>
    : never {
    const originalMethod = this.wrapped[methodName];

    if (typeof originalMethod !== 'function') {
      throw new Error(`${String(methodName)} is not a function`);
    }

    const operationName = customName ?? String(methodName);
    const logger = this.logger;
    const wrapped = this.wrapped;

    return (async (...args: unknown[]) => {
      const startTime = performance.now();

      try {
        const result = await originalMethod.apply(wrapped, args);
        return result;
      } finally {
        const endTime = performance.now();
        const duration = Math.round((endTime - startTime) * 100) / 100;

        logger({
          method: 'OPERATION',
          path: operationName,
          duration,
          timestamp: new Date(),
        });
      }
    }) as any;
  }
}
