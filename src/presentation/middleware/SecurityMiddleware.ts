import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { IRateLimiter, RateLimitConfig } from '../../infrastructure/security/RateLimiter';
import { IInputValidator } from '../../infrastructure/security/InputValidator';

export interface SecurityRequest extends Request {
  requestId?: string;
  clientIp?: string;
  csrfToken?: string;
}

export function requestIdMiddleware() {
  return (req: SecurityRequest, res: Response, next: NextFunction): void => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
  };
}

export function clientIpMiddleware() {
  return (req: SecurityRequest, _res: Response, next: NextFunction): void => {
    req.clientIp = (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
    next();
  };
}

export function createRateLimitMiddleware(rateLimiter: IRateLimiter, config?: Partial<RateLimitConfig>) {
  return (req: SecurityRequest, res: Response, next: NextFunction): void => {
    const key = `${req.clientIp || req.ip}:${req.path}`;
    const result = rateLimiter.check(key, config);

    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter?.toString() || '60');
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: result.retryAfter,
      });
      return;
    }

    next();
  };
}

export function securityHeadersMiddleware() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.removeHeader('X-Powered-By');
    next();
  };
}

export function csrfMiddleware() {
  const tokens = new Map<string, { token: string; expires: number }>();
  
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of tokens.entries()) {
      if (value.expires < now) tokens.delete(key);
    }
  }, 60000);

  return {
    generateToken: (req: SecurityRequest, res: Response, next: NextFunction): void => {
      const sessionId = req.headers['x-session-id'] as string || crypto.randomUUID();
      const token = crypto.randomBytes(32).toString('hex');
      tokens.set(sessionId, { token, expires: Date.now() + 3600000 });
      req.csrfToken = token;
      res.setHeader('X-CSRF-Token', token);
      next();
    },
    
    validateToken: (req: SecurityRequest, res: Response, next: NextFunction): void => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        next();
        return;
      }

      const sessionId = req.headers['x-session-id'] as string;
      const csrfToken = req.headers['x-csrf-token'] as string;

      if (!sessionId || !csrfToken) {
        res.status(403).json({ success: false, error: 'CSRF token missing' });
        return;
      }

      const stored = tokens.get(sessionId);
      if (!stored || stored.token !== csrfToken || stored.expires < Date.now()) {
        res.status(403).json({ success: false, error: 'Invalid CSRF token' });
        return;
      }

      next();
    },
  };
}

export function createInputSanitizationMiddleware(validator: IInputValidator) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, validator);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query as Record<string, unknown>, validator) as typeof req.query;
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params, validator) as typeof req.params;
    }
    next();
  };
}

function sanitizeObject(obj: Record<string, unknown>, validator: IInputValidator): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = validator.sanitizeString(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'string' ? validator.sanitizeString(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>, validator);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function sqlInjectionProtection() {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
    /(--|#|\/\*|\*\/)/g,
    /(\bOR\b|\bAND\b).*[=<>]/gi,
    /['";]/g,
  ];

  return (req: Request, res: Response, next: NextFunction): void => {
    const checkValue = (value: unknown): boolean => {
      if (typeof value === 'string') {
        return sqlPatterns.some(pattern => pattern.test(value));
      }
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(v => checkValue(v));
      }
      return false;
    };

    const hasSqlInjection = 
      checkValue(req.body) || 
      checkValue(req.query) || 
      checkValue(req.params);

    if (hasSqlInjection) {
      res.status(400).json({ success: false, error: 'Invalid input detected' });
      return;
    }

    next();
  };
}

export function requestSizeLimitMiddleware(maxSizeKB: number = 1024) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxSizeKB * 1024) {
      res.status(413).json({ success: false, error: 'Request entity too large' });
      return;
    }
    next();
  };
}

export function corsOptionsMiddleware(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Session-ID, X-Request-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    
    next();
  };
}
