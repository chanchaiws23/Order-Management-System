import { Request, Response, NextFunction } from 'express';
import {
  LogExecutionTime,
  withExecutionLogging,
  ExecutionTimeDecorator,
  ExecutionLog,
  LoggerFunction,
} from '../../../src/presentation/decorators/LogExecutionTime';

describe('LogExecutionTime', () => {
  describe('LogExecutionTime middleware', () => {
    it('should log execution time of handler', async () => {
      const logs: ExecutionLog[] = [];
      const mockLogger: LoggerFunction = (log) => logs.push(log);

      const handler = async (req: Request, res: Response, next: NextFunction) => {
        res.status(200);
      };

      const wrappedHandler = LogExecutionTime(mockLogger)(handler);

      const mockReq = { method: 'GET', originalUrl: '/test', path: '/test' } as Request;
      const mockRes = { statusCode: 200, status: jest.fn().mockReturnThis() } as unknown as Response;
      const mockNext = jest.fn() as NextFunction;

      await wrappedHandler(mockReq, mockRes, mockNext);

      expect(logs.length).toBe(1);
      expect(logs[0].method).toBe('GET');
      expect(logs[0].path).toBe('/test');
      expect(logs[0].statusCode).toBe(200);
      expect(logs[0].duration).toBeGreaterThanOrEqual(0);
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('should use path if originalUrl is not available', async () => {
      const logs: ExecutionLog[] = [];
      const mockLogger: LoggerFunction = (log) => logs.push(log);

      const handler = async (req: Request, res: Response, next: NextFunction) => {};

      const wrappedHandler = LogExecutionTime(mockLogger)(handler);

      const mockReq = { method: 'POST', originalUrl: '', path: '/fallback' } as Request;
      const mockRes = { statusCode: 201 } as Response;
      const mockNext = jest.fn() as NextFunction;

      await wrappedHandler(mockReq, mockRes, mockNext);

      expect(logs[0].path).toBe('/fallback');
    });

    it('should log even if handler throws', async () => {
      const logs: ExecutionLog[] = [];
      const mockLogger: LoggerFunction = (log) => logs.push(log);

      const handler = async (req: Request, res: Response, next: NextFunction) => {
        throw new Error('Test error');
      };

      const wrappedHandler = LogExecutionTime(mockLogger)(handler);

      const mockReq = { method: 'GET', originalUrl: '/error', path: '/error' } as Request;
      const mockRes = { statusCode: 500 } as Response;
      const mockNext = jest.fn() as NextFunction;

      await expect(wrappedHandler(mockReq, mockRes, mockNext)).rejects.toThrow('Test error');
      expect(logs.length).toBe(1);
    });
  });

  describe('withExecutionLogging', () => {
    it('should wrap async function and log execution', async () => {
      const logs: ExecutionLog[] = [];
      const mockLogger: LoggerFunction = (log) => logs.push(log);

      const asyncFn = async (a: number, b: number) => {
        return a + b;
      };

      const wrappedFn = withExecutionLogging(asyncFn, 'addNumbers', mockLogger);
      const result = await wrappedFn(2, 3);

      expect(result).toBe(5);
      expect(logs.length).toBe(1);
      expect(logs[0].method).toBe('OPERATION');
      expect(logs[0].path).toBe('addNumbers');
    });

    it('should log even if function throws', async () => {
      const logs: ExecutionLog[] = [];
      const mockLogger: LoggerFunction = (log) => logs.push(log);

      const asyncFn = async () => {
        throw new Error('Async error');
      };

      const wrappedFn = withExecutionLogging(asyncFn, 'failingOp', mockLogger);

      await expect(wrappedFn()).rejects.toThrow('Async error');
      expect(logs.length).toBe(1);
    });
  });

  describe('ExecutionTimeDecorator', () => {
    it('should wrap object method and log execution', async () => {
      const logs: ExecutionLog[] = [];
      const mockLogger: LoggerFunction = (log) => logs.push(log);

      const service = {
        async calculate(x: number): Promise<number> {
          return x * 2;
        },
      };

      const decorator = new ExecutionTimeDecorator(service, mockLogger);
      const wrappedMethod = decorator.wrap('calculate');

      const result = await wrappedMethod(5);

      expect(result).toBe(10);
      expect(logs.length).toBe(1);
      expect(logs[0].path).toBe('calculate');
    });

    it('should use custom name if provided', async () => {
      const logs: ExecutionLog[] = [];
      const mockLogger: LoggerFunction = (log) => logs.push(log);

      const service = {
        async doSomething(): Promise<string> {
          return 'done';
        },
      };

      const decorator = new ExecutionTimeDecorator(service, mockLogger);
      const wrappedMethod = decorator.wrap('doSomething', 'CustomOperationName');

      await wrappedMethod();

      expect(logs[0].path).toBe('CustomOperationName');
    });

    it('should throw error if method is not a function', () => {
      const service = {
        notAFunction: 'string value',
      };

      const decorator = new ExecutionTimeDecorator(service);

      expect(() => decorator.wrap('notAFunction' as any)).toThrow('notAFunction is not a function');
    });

    it('should log even if wrapped method throws', async () => {
      const logs: ExecutionLog[] = [];
      const mockLogger: LoggerFunction = (log) => logs.push(log);

      const service = {
        async fail(): Promise<void> {
          throw new Error('Method failed');
        },
      };

      const decorator = new ExecutionTimeDecorator(service, mockLogger);
      const wrappedMethod = decorator.wrap('fail');

      await expect(wrappedMethod()).rejects.toThrow('Method failed');
      expect(logs.length).toBe(1);
    });

    it('should use default logger if not provided', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const service = {
        async test(): Promise<string> {
          return 'test';
        },
      };

      const decorator = new ExecutionTimeDecorator(service);
      const wrappedMethod = decorator.wrap('test');

      await wrappedMethod();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
