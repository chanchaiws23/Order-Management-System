import { AuthUseCases } from '../../../src/application/use-cases/AuthUseCases';
import { User } from '../../../src/domain/entities/User';
import { Role } from '../../../src/domain/value-objects/Role';
import { IUserRepository } from '../../../src/domain/repositories/IUserRepository';
import { IAuditLogRepository } from '../../../src/domain/repositories/IAuditLogRepository';
import { IPasswordHasher } from '../../../src/infrastructure/security/PasswordHasher';
import { IJwtService, TokenPair } from '../../../src/infrastructure/security/JwtService';
import { IdGenerator } from '../../../src/application/use-cases/CreateOrderUseCase';

describe('AuthUseCases', () => {
  let authUseCases: AuthUseCases;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockAuditRepo: jest.Mocked<IAuditLogRepository>;
  let mockPasswordHasher: jest.Mocked<IPasswordHasher>;
  let mockJwtService: jest.Mocked<IJwtService>;
  let mockIdGenerator: jest.Mocked<IdGenerator>;

  beforeEach(() => {
    // Create mocks
    mockUserRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByRefreshToken: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      existsByEmail: jest.fn(),
      count: jest.fn(),
      countByRole: jest.fn(),
    };

    mockAuditRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByAction: jest.fn(),
      search: jest.fn(),
      findSuspiciousActivity: jest.fn(),
      findFailedLogins: jest.fn(),
      countByActionSince: jest.fn(),
      deleteOlderThan: jest.fn(),
    };

    mockPasswordHasher = {
      hash: jest.fn(),
      verify: jest.fn(),
      isStrongPassword: jest.fn(),
    };

    mockJwtService = {
      generateTokenPair: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      hashToken: jest.fn(),
      decodeWithoutVerify: jest.fn(),
    };

    mockIdGenerator = {
      generate: jest.fn().mockReturnValue('generated-uuid'),
    };

    authUseCases = new AuthUseCases(
      mockUserRepo,
      mockAuditRepo,
      mockPasswordHasher,
      mockJwtService,
      mockIdGenerator
    );
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockPasswordHasher.isStrongPassword.mockReturnValue({ valid: true, errors: [] });
      mockPasswordHasher.hash.mockResolvedValue('hashed_password');
      mockUserRepo.save.mockResolvedValue();
      mockAuditRepo.save.mockResolvedValue();

      // Act
      const result = await authUseCases.register(registerDto, '192.168.1.1');

      // Assert
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockPasswordHasher.isStrongPassword).toHaveBeenCalledWith('SecurePass123!');
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('SecurePass123!');
      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(result.email).toBe('test@example.com');
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      const existingUser = User.create({
        id: 'existing-id',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      mockUserRepo.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(authUseCases.register(registerDto, '192.168.1.1'))
        .rejects.toThrow('Email already registered');
    });

    it('should throw error for weak password', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockPasswordHasher.isStrongPassword.mockReturnValue({
        valid: false,
        errors: ['Password too short'],
      });

      // Act & Assert
      await expect(authUseCases.register(registerDto, '192.168.1.1'))
        .rejects.toThrow('Weak password: Password too short');
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should login successfully with valid credentials', async () => {
      // Arrange
      const user = User.create({
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
      });
      const tokens: TokenPair = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresIn: 900,
      };

      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockPasswordHasher.verify.mockResolvedValue(true);
      mockJwtService.generateTokenPair.mockReturnValue(tokens);
      mockJwtService.hashToken.mockReturnValue('hashed_refresh_token');
      mockUserRepo.save.mockResolvedValue();
      mockAuditRepo.save.mockResolvedValue();

      // Act
      const result = await authUseCases.login(loginDto);

      // Assert
      expect(result.tokens.accessToken).toBe('access_token');
      expect(result.tokens.refreshToken).toBe('refresh_token');
      expect(mockAuditRepo.save).toHaveBeenCalled();
    });

    it('should throw error for non-existent user', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockAuditRepo.save.mockResolvedValue();

      // Act & Assert
      await expect(authUseCases.login(loginDto))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      // Arrange
      const user = User.create({
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
      });

      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockPasswordHasher.verify.mockResolvedValue(false);
      mockUserRepo.save.mockResolvedValue();
      mockAuditRepo.save.mockResolvedValue();

      // Act & Assert
      await expect(authUseCases.login(loginDto))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw error for locked account', async () => {
      // Arrange
      const user = User.create({
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
      });
      // Lock the account
      for (let i = 0; i < 5; i++) {
        user.recordFailedLogin();
      }

      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockAuditRepo.save.mockResolvedValue();

      // Act & Assert
      await expect(authUseCases.login(loginDto))
        .rejects.toThrow('Account is locked');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      // Arrange
      const user = User.create({
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'old_hash',
        firstName: 'John',
        lastName: 'Doe',
      });

      mockUserRepo.findById.mockResolvedValue(user);
      mockPasswordHasher.verify.mockResolvedValue(true);
      mockPasswordHasher.isStrongPassword.mockReturnValue({ valid: true, errors: [] });
      mockPasswordHasher.hash.mockResolvedValue('new_hash');
      mockUserRepo.save.mockResolvedValue();
      mockAuditRepo.save.mockResolvedValue();

      // Act
      await authUseCases.changePassword({
        userId: 'user-id',
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        ipAddress: '192.168.1.1',
      });

      // Assert
      expect(mockPasswordHasher.verify).toHaveBeenCalledWith('OldPass123!', 'old_hash');
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('NewPass123!');
      expect(mockUserRepo.save).toHaveBeenCalled();
    });

    it('should throw error for incorrect current password', async () => {
      // Arrange
      const user = User.create({
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'old_hash',
        firstName: 'John',
        lastName: 'Doe',
      });

      mockUserRepo.findById.mockResolvedValue(user);
      mockPasswordHasher.verify.mockResolvedValue(false);
      mockAuditRepo.save.mockResolvedValue();

      // Act & Assert
      await expect(authUseCases.changePassword({
        userId: 'user-id',
        currentPassword: 'WrongPass!',
        newPassword: 'NewPass123!',
        ipAddress: '192.168.1.1',
      })).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(authUseCases.changePassword({
        userId: 'non-existent',
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        ipAddress: '192.168.1.1',
      })).rejects.toThrow('User not found');
    });

    it('should throw error for weak new password', async () => {
      const user = User.create({
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'old_hash',
        firstName: 'John',
        lastName: 'Doe',
      });

      mockUserRepo.findById.mockResolvedValue(user);
      mockPasswordHasher.verify.mockResolvedValue(true);
      mockPasswordHasher.isStrongPassword.mockReturnValue({
        valid: false,
        errors: ['Too short', 'No uppercase'],
      });

      await expect(authUseCases.changePassword({
        userId: 'user-id',
        currentPassword: 'OldPass123!',
        newPassword: 'weak',
        ipAddress: '192.168.1.1',
      })).rejects.toThrow('Weak password: Too short, No uppercase');
    });
  });

  describe('login - account locking', () => {
    it('should log audit when account gets locked after failed attempt', async () => {
      // Create a user that is almost locked (4 failed attempts)
      const user = User.create({
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
      });
      // Simulate 4 previous failed attempts
      for (let i = 0; i < 4; i++) {
        user.recordFailedLogin();
      }

      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockPasswordHasher.verify.mockResolvedValue(false);
      mockUserRepo.save.mockResolvedValue();
      mockAuditRepo.save.mockResolvedValue();

      // Act - this 5th attempt should lock the account
      await expect(authUseCases.login({
        email: 'test@example.com',
        password: 'wrong',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })).rejects.toThrow('Invalid credentials');

      // Assert - should have 2 audit logs: LOGIN_FAILED and USER_LOCKED
      expect(mockAuditRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const user = User.create({
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Doe',
      });
      const tokens: TokenPair = {
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
        expiresIn: 900,
      };

      mockJwtService.verifyRefreshToken.mockReturnValue({ userId: 'user-id', email: 'test@example.com', role: Role.CUSTOMER, type: 'refresh', iat: Date.now(), exp: Date.now() + 86400000, jti: 'jti-123' } as any);
      mockJwtService.hashToken.mockReturnValue('hashed_token');
      mockUserRepo.findByRefreshToken.mockResolvedValue(user);
      mockJwtService.generateTokenPair.mockReturnValue(tokens);
      mockUserRepo.save.mockResolvedValue();

      const result = await authUseCases.refreshTokens('valid_refresh_token', '192.168.1.1');

      expect(result.accessToken).toBe('new_access');
      expect(result.refreshToken).toBe('new_refresh');
    });

    it('should throw error for invalid refresh token', async () => {
      mockJwtService.verifyRefreshToken.mockReturnValue(null);

      await expect(authUseCases.refreshTokens('invalid_token', '192.168.1.1'))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should throw error when user not found by refresh token', async () => {
      mockJwtService.verifyRefreshToken.mockReturnValue({ userId: 'user-id', email: 'test@example.com', role: Role.CUSTOMER, type: 'refresh', iat: Date.now(), exp: Date.now() + 86400000, jti: 'jti-123' } as any);
      mockJwtService.hashToken.mockReturnValue('hashed_token');
      mockUserRepo.findByRefreshToken.mockResolvedValue(null);

      await expect(authUseCases.refreshTokens('valid_token', '192.168.1.1'))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should throw error when user id does not match payload', async () => {
      const user = User.create({
        id: 'different-user-id',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Doe',
      });

      mockJwtService.verifyRefreshToken.mockReturnValue({ userId: 'user-id', email: 'test@example.com', role: Role.CUSTOMER, type: 'refresh', iat: Date.now(), exp: Date.now() + 86400000, jti: 'jti-123' } as any);
      mockJwtService.hashToken.mockReturnValue('hashed_token');
      mockUserRepo.findByRefreshToken.mockResolvedValue(user);

      await expect(authUseCases.refreshTokens('valid_token', '192.168.1.1'))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should throw error when user account is not active', async () => {
      const user = User.create({
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Doe',
      });
      user.deactivate(); // Make user inactive

      mockJwtService.verifyRefreshToken.mockReturnValue({ userId: 'user-id', email: 'test@example.com', role: Role.CUSTOMER, type: 'refresh', iat: Date.now(), exp: Date.now() + 86400000, jti: 'jti-123' } as any);
      mockJwtService.hashToken.mockReturnValue('hashed_token');
      mockUserRepo.findByRefreshToken.mockResolvedValue(user);

      await expect(authUseCases.refreshTokens('valid_token', '192.168.1.1'))
        .rejects.toThrow('Account is not active');
    });
  });

  describe('logout', () => {
    it('should logout and clear refresh token', async () => {
      const user = User.create({
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Doe',
      });
      user.setRefreshToken('token_hash');

      mockUserRepo.findById.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue();
      mockAuditRepo.save.mockResolvedValue();

      await authUseCases.logout('user-id', '192.168.1.1');

      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(mockAuditRepo.save).toHaveBeenCalled();
    });

    it('should do nothing if user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await authUseCases.logout('non-existent', '192.168.1.1');

      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });
  });
});
