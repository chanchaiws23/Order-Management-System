import { RateLimiter } from '../../../src/infrastructure/security/RateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 5,
    });
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  describe('check', () => {
    it('should allow requests within limit', () => {
      const result = rateLimiter.check('test-key');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should decrement remaining on each request', () => {
      const r1 = rateLimiter.check('test-key');
      const r2 = rateLimiter.check('test-key');
      const r3 = rateLimiter.check('test-key');

      expect(r1.remaining).toBe(4);
      expect(r2.remaining).toBe(3);
      expect(r3.remaining).toBe(2);
    });

    it('should block when limit exceeded', () => {
      for (let i = 0; i < 5; i++) {
        rateLimiter.check('test-key');
      }

      const result = rateLimiter.check('test-key');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should track different keys separately', () => {
      for (let i = 0; i < 5; i++) {
        rateLimiter.check('key-1');
      }

      const result1 = rateLimiter.check('key-1');
      const result2 = rateLimiter.check('key-2');

      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(true);
    });

    it('should use custom config when provided', () => {
      const result = rateLimiter.check('test-key', { maxRequests: 2 });
      expect(result.remaining).toBe(1);

      rateLimiter.check('test-key', { maxRequests: 2 });
      const blocked = rateLimiter.check('test-key', { maxRequests: 2 });
      expect(blocked.allowed).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset rate limit for key', () => {
      for (let i = 0; i < 5; i++) {
        rateLimiter.check('test-key');
      }
      expect(rateLimiter.check('test-key').allowed).toBe(false);

      rateLimiter.reset('test-key');

      const result = rateLimiter.check('test-key');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 max - 1 from this check = 4
    });
  });

  describe('increment', () => {
    it('should increment count for existing key', () => {
      rateLimiter.check('test-key');
      rateLimiter.increment('test-key');

      const result = rateLimiter.check('test-key');
      expect(result.remaining).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return stats', () => {
      rateLimiter.check('key-1');
      rateLimiter.check('key-1');
      rateLimiter.check('key-2');

      const stats = rateLimiter.getStats();

      expect(stats.totalKeys).toBe(2);
      expect(stats.totalRequests).toBe(3);
    });
  });

  describe('cleanup (internal)', () => {
    it('should clean up expired entries via interval', () => {
      jest.useFakeTimers();

      // Create a rate limiter - cleanup runs every 60 seconds
      const testLimiter = new RateLimiter({
        windowMs: 1000, // 1 second window
        maxRequests: 5,
      });

      // Add some entries
      testLimiter.check('key-1');
      testLimiter.check('key-2');
      expect(testLimiter.getStats().totalKeys).toBe(2);

      // Advance time past the window expiry
      jest.advanceTimersByTime(2000); // 2 seconds - entries should be expired

      // Advance time to trigger cleanup interval (60 seconds)
      jest.advanceTimersByTime(60000);

      // Entries should now be cleaned up
      expect(testLimiter.getStats().totalKeys).toBe(0);

      testLimiter.destroy();
      jest.useRealTimers();
    });

    it('should not clean up entries that are not expired', () => {
      jest.useFakeTimers();

      const testLimiter = new RateLimiter({
        windowMs: 120000, // 2 minutes window
        maxRequests: 5,
      });

      testLimiter.check('active-key');
      expect(testLimiter.getStats().totalKeys).toBe(1);

      // Advance time to trigger cleanup but entries not expired yet
      jest.advanceTimersByTime(60000); // 1 minute - cleanup runs but entries still valid

      // Entry should still exist
      expect(testLimiter.getStats().totalKeys).toBe(1);

      testLimiter.destroy();
      jest.useRealTimers();
    });
  });

  describe('destroy', () => {
    it('should clear all data and stop interval', () => {
      rateLimiter.check('key-1');
      rateLimiter.check('key-2');
      expect(rateLimiter.getStats().totalKeys).toBe(2);

      rateLimiter.destroy();

      expect(rateLimiter.getStats().totalKeys).toBe(0);
    });
  });

  describe('default config', () => {
    it('should use default values when no config provided', () => {
      const defaultLimiter = new RateLimiter();
      const result = defaultLimiter.check('test');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
      
      defaultLimiter.destroy();
    });
  });
});
