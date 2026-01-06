import { JwtService } from '../../../src/infrastructure/security/JwtService';

describe('JwtService', () => {
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({
      accessSecret: 'test-access-secret-key-32-chars!',
      refreshSecret: 'test-refresh-secret-key-32-chars',
      accessExpiresInMinutes: 15,
      refreshExpiresInDays: 7,
    });
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', () => {
      const tokens = jwtService.generateTokenPair('user-123', 'test@example.com', 'ADMIN');

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(15 * 60);
      expect(tokens.accessToken.split('.')).toHaveLength(3);
      expect(tokens.refreshToken.split('.')).toHaveLength(3);
    });

    it('should generate different tokens for different users', () => {
      const tokens1 = jwtService.generateTokenPair('user-1', 'user1@example.com', 'USER');
      const tokens2 = jwtService.generateTokenPair('user-2', 'user2@example.com', 'USER');

      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const tokens = jwtService.generateTokenPair('user-123', 'test@example.com', 'ADMIN');

      const payload = jwtService.verifyAccessToken(tokens.accessToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-123');
      expect(payload?.email).toBe('test@example.com');
      expect(payload?.role).toBe('ADMIN');
      expect(payload?.type).toBe('access');
    });

    it('should return null for invalid token', () => {
      const payload = jwtService.verifyAccessToken('invalid.token.here');

      expect(payload).toBeNull();
    });

    it('should return null for refresh token used as access token', () => {
      const tokens = jwtService.generateTokenPair('user-123', 'test@example.com', 'ADMIN');

      const payload = jwtService.verifyAccessToken(tokens.refreshToken);

      expect(payload).toBeNull();
    });

    it('should return null for tampered token', () => {
      const tokens = jwtService.generateTokenPair('user-123', 'test@example.com', 'ADMIN');
      const tamperedToken = tokens.accessToken.slice(0, -5) + 'xxxxx';

      const payload = jwtService.verifyAccessToken(tamperedToken);

      expect(payload).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const tokens = jwtService.generateTokenPair('user-123', 'test@example.com', 'ADMIN');

      const payload = jwtService.verifyRefreshToken(tokens.refreshToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-123');
      expect(payload?.type).toBe('refresh');
    });

    it('should return null for access token used as refresh token', () => {
      const tokens = jwtService.generateTokenPair('user-123', 'test@example.com', 'ADMIN');

      const payload = jwtService.verifyRefreshToken(tokens.accessToken);

      expect(payload).toBeNull();
    });
  });

  describe('hashToken', () => {
    it('should hash token deterministically', () => {
      const token = 'some-token-value';

      const hash1 = jwtService.hashToken(token);
      const hash2 = jwtService.hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
      expect(hash1.length).toBe(64); // SHA-256 hex
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = jwtService.hashToken('token-1');
      const hash2 = jwtService.hashToken('token-2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('decodeWithoutVerify', () => {
    it('should decode token without verification', () => {
      const tokens = jwtService.generateTokenPair('user-123', 'test@example.com', 'ADMIN');

      const payload = jwtService.decodeWithoutVerify(tokens.accessToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-123');
    });

    it('should return null for invalid format', () => {
      const payload = jwtService.decodeWithoutVerify('not-a-jwt');

      expect(payload).toBeNull();
    });

    it('should return null for invalid base64 payload', () => {
      // Create a token with invalid base64 in payload section
      const payload = jwtService.decodeWithoutVerify('header.!!!invalid-base64!!!.signature');

      expect(payload).toBeNull();
    });
  });

  describe('expired token', () => {
    it('should return null for expired access token', () => {
      // Create a service with very short expiry
      const shortExpiryService = new JwtService({
        accessSecret: 'test-access-secret-key-32-chars!',
        refreshSecret: 'test-refresh-secret-key-32-chars',
        accessExpiresInMinutes: -1, // Already expired
        refreshExpiresInDays: 7,
      });

      const tokens = shortExpiryService.generateTokenPair('user-123', 'test@example.com', 'ADMIN');
      const payload = shortExpiryService.verifyAccessToken(tokens.accessToken);

      expect(payload).toBeNull();
    });
  });
});
