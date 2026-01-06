import { PasswordHasher } from '../../../src/infrastructure/security/PasswordHasher';

describe('PasswordHasher', () => {
  let passwordHasher: PasswordHasher;

  beforeEach(() => {
    passwordHasher = new PasswordHasher();
  });

  describe('hash', () => {
    it('should generate a hash with salt', async () => {
      const password = 'SecurePassword123!';
      
      const hash = await passwordHasher.hash(password);

      expect(hash).toContain(':');
      const [salt, hashPart] = hash.split(':');
      expect(salt.length).toBe(64); // 32 bytes = 64 hex chars
      expect(hashPart.length).toBe(128); // 64 bytes = 128 hex chars
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SecurePassword123!';

      const hash1 = await passwordHasher.hash(password);
      const hash2 = await passwordHasher.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should return true for correct password', async () => {
      const password = 'SecurePassword123!';
      const hash = await passwordHasher.hash(password);

      const isValid = await passwordHasher.verify(password, hash);

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'SecurePassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await passwordHasher.hash(password);

      const isValid = await passwordHasher.verify(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const isValid = await passwordHasher.verify('password', 'invalid_hash');

      expect(isValid).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('should accept strong password', () => {
      const result = passwordHasher.isStrongPassword('SecurePass123!@#');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short password', () => {
      const result = passwordHasher.isStrongPassword('Short1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should reject password without lowercase', () => {
      const result = passwordHasher.isStrongPassword('ALLUPPERCASE123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase', () => {
      const result = passwordHasher.isStrongPassword('alllowercase123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const result = passwordHasher.isStrongPassword('NoNumbersHere!@#');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = passwordHasher.isStrongPassword('NoSpecialChar123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common passwords', () => {
      const result = passwordHasher.isStrongPassword('password123ABC!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is too common');
    });

    it('should reject password that is too long', () => {
      const longPassword = 'A'.repeat(129) + 'a1!'; // Over 128 characters
      const result = passwordHasher.isStrongPassword(longPassword);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });
  });
});
