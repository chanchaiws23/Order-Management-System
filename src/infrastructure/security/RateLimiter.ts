export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface IRateLimiter {
  check(key: string, config?: Partial<RateLimitConfig>): RateLimitResult;
  reset(key: string): void;
  increment(key: string): void;
  getStats(): { totalKeys: number; totalRequests: number };
}

export class RateLimiter implements IRateLimiter {
  private readonly store: Map<string, RateLimitEntry> = new Map();
  private readonly defaultConfig: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config?: Partial<RateLimitConfig>) {
    this.defaultConfig = {
      windowMs: config?.windowMs ?? 60 * 1000,
      maxRequests: config?.maxRequests ?? 100,
      message: config?.message ?? 'Too many requests, please try again later',
      skipSuccessfulRequests: config?.skipSuccessfulRequests ?? false,
      skipFailedRequests: config?.skipFailedRequests ?? false,
    };

    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  check(key: string, config?: Partial<RateLimitConfig>): RateLimitResult {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + mergedConfig.windowMs });
      return {
        allowed: true,
        remaining: mergedConfig.maxRequests - 1,
        resetAt: new Date(now + mergedConfig.windowMs),
      };
    }

    if (entry.count >= mergedConfig.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.resetAt),
        retryAfter,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: mergedConfig.maxRequests - entry.count,
      resetAt: new Date(entry.resetAt),
    };
  }

  increment(key: string): void {
    const entry = this.store.get(key);
    if (entry) {
      entry.count++;
    }
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  getStats(): { totalKeys: number; totalRequests: number } {
    let totalRequests = 0;
    this.store.forEach(entry => { totalRequests += entry.count; });
    return { totalKeys: this.store.size, totalRequests };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

export const rateLimitConfigs = {
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5, message: 'Too many login attempts' },
  register: { windowMs: 60 * 60 * 1000, maxRequests: 3, message: 'Too many registration attempts' },
  passwordReset: { windowMs: 60 * 60 * 1000, maxRequests: 3, message: 'Too many password reset requests' },
  api: { windowMs: 60 * 1000, maxRequests: 100, message: 'API rate limit exceeded' },
  strict: { windowMs: 60 * 1000, maxRequests: 10, message: 'Rate limit exceeded' },
};
