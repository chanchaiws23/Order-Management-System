import { User } from '../../../src/domain/entities/User';
import { Role } from '../../../src/domain/value-objects/Role';

describe('User Entity', () => {
  const validUserProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    firstName: 'John',
    lastName: 'Doe',
  };

  describe('create', () => {
    it('should create a user with valid props', () => {
      const user = User.create(validUserProps);

      expect(user.id).toBe(validUserProps.id);
      expect(user.email).toBe(validUserProps.email);
      expect(user.firstName).toBe(validUserProps.firstName);
      expect(user.lastName).toBe(validUserProps.lastName);
      expect(user.role).toBe(Role.CUSTOMER);
      expect(user.isActive).toBe(true);
      expect(user.isEmailVerified).toBe(false);
      expect(user.failedLoginAttempts).toBe(0);
    });

    it('should create a user with custom role', () => {
      const user = User.create({ ...validUserProps, role: Role.ADMIN });

      expect(user.role).toBe(Role.ADMIN);
    });

    it('should throw error for invalid email', () => {
      expect(() => User.create({ ...validUserProps, email: 'invalid-email' }))
        .toThrow('Invalid email format');
    });

    it('should throw error for empty first name', () => {
      expect(() => User.create({ ...validUserProps, firstName: '' }))
        .toThrow('First name is required');
    });

    it('should throw error for empty last name', () => {
      expect(() => User.create({ ...validUserProps, lastName: '   ' }))
        .toThrow('Last name is required');
    });
  });

  describe('fullName', () => {
    it('should return concatenated first and last name', () => {
      const user = User.create(validUserProps);

      expect(user.fullName).toBe('John Doe');
    });
  });

  describe('recordFailedLogin', () => {
    it('should increment failed login attempts', () => {
      const user = User.create(validUserProps);

      user.recordFailedLogin();
      expect(user.failedLoginAttempts).toBe(1);

      user.recordFailedLogin();
      expect(user.failedLoginAttempts).toBe(2);
    });

    it('should lock account after 5 failed attempts', () => {
      const user = User.create(validUserProps);

      for (let i = 0; i < 5; i++) {
        user.recordFailedLogin();
      }

      expect(user.failedLoginAttempts).toBe(5);
      expect(user.isLocked).toBe(true);
      expect(user.canLogin).toBe(false);
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('should reset failed login attempts', () => {
      const user = User.create(validUserProps);
      user.recordFailedLogin();
      user.recordFailedLogin();

      user.recordSuccessfulLogin('192.168.1.1');

      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lastLoginIp).toBe('192.168.1.1');
      expect(user.lastLoginAt).toBeDefined();
    });
  });

  describe('changePassword', () => {
    it('should update password hash and clear refresh token', () => {
      const user = User.create(validUserProps);
      user.setRefreshToken('old_token_hash');

      user.changePassword('new_password_hash');

      expect(user.passwordHash).toBe('new_password_hash');
      expect(user.refreshTokenHash).toBeUndefined();
    });
  });

  describe('activate/deactivate', () => {
    it('should activate user', () => {
      const user = User.create(validUserProps);
      user.deactivate();
      
      user.activate();

      expect(user.isActive).toBe(true);
      expect(user.canLogin).toBe(true);
    });

    it('should deactivate user and clear refresh token', () => {
      const user = User.create(validUserProps);
      user.setRefreshToken('token_hash');

      user.deactivate();

      expect(user.isActive).toBe(false);
      expect(user.refreshTokenHash).toBeUndefined();
      expect(user.canLogin).toBe(false);
    });
  });

  describe('toSafeObject', () => {
    it('should exclude sensitive fields', () => {
      const user = User.create(validUserProps);
      const safeObj = user.toSafeObject();

      expect(safeObj).not.toHaveProperty('passwordHash');
      expect(safeObj).not.toHaveProperty('refreshTokenHash');
      expect(safeObj).not.toHaveProperty('twoFactorSecret');
      expect(safeObj).toHaveProperty('email');
      expect(safeObj).toHaveProperty('firstName');
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute user from props', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');
      const user = User.reconstitute({
        ...validUserProps,
        role: Role.ADMIN,
        isActive: false,
        isEmailVerified: true,
        failedLoginAttempts: 3,
        lockedUntil: new Date('2025-01-01'),
        lastLoginAt: new Date('2024-06-01'),
        lastLoginIp: '10.0.0.1',
        passwordChangedAt: new Date('2024-05-01'),
        refreshTokenHash: 'token_hash',
        twoFactorSecret: 'secret',
        twoFactorEnabled: true,
        createdAt,
        updatedAt,
      });

      expect(user.role).toBe(Role.ADMIN);
      expect(user.isActive).toBe(false);
      expect(user.isEmailVerified).toBe(true);
      expect(user.failedLoginAttempts).toBe(3);
      expect(user.lockedUntil).toBeInstanceOf(Date);
      expect(user.lastLoginAt).toBeInstanceOf(Date);
      expect(user.lastLoginIp).toBe('10.0.0.1');
      expect(user.passwordChangedAt).toBeInstanceOf(Date);
      expect(user.refreshTokenHash).toBe('token_hash');
      expect(user.twoFactorSecret).toBe('secret');
      expect(user.twoFactorEnabled).toBe(true);
      expect(user.createdAt).toBe(createdAt);
      expect(user.updatedAt).toBe(updatedAt);
    });
  });

  describe('verifyEmail', () => {
    it('should mark email as verified', () => {
      const user = User.create(validUserProps);
      expect(user.isEmailVerified).toBe(false);

      user.verifyEmail();
      expect(user.isEmailVerified).toBe(true);
    });
  });

  describe('2FA', () => {
    it('should enable 2FA', () => {
      const user = User.create(validUserProps);

      user.enable2FA('JBSWY3DPEHPK3PXP');

      expect(user.twoFactorEnabled).toBe(true);
      expect(user.twoFactorSecret).toBe('JBSWY3DPEHPK3PXP');
    });

    it('should disable 2FA', () => {
      const user = User.create(validUserProps);
      user.enable2FA('secret');

      user.disable2FA();

      expect(user.twoFactorEnabled).toBe(false);
      expect(user.twoFactorSecret).toBeUndefined();
    });
  });

  describe('updateRole', () => {
    it('should update user role', () => {
      const user = User.create(validUserProps);
      expect(user.role).toBe(Role.CUSTOMER);

      user.updateRole(Role.MANAGER);
      expect(user.role).toBe(Role.MANAGER);
    });
  });

  describe('updateProfile', () => {
    it('should update first and last name', () => {
      const user = User.create(validUserProps);

      user.updateProfile({ firstName: 'Jane', lastName: 'Smith' });

      expect(user.firstName).toBe('Jane');
      expect(user.lastName).toBe('Smith');
    });

    it('should update only first name', () => {
      const user = User.create(validUserProps);

      user.updateProfile({ firstName: 'Jane' });

      expect(user.firstName).toBe('Jane');
      expect(user.lastName).toBe('Doe');
    });
  });

  describe('clearRefreshToken', () => {
    it('should clear refresh token', () => {
      const user = User.create(validUserProps);
      user.setRefreshToken('token_hash');
      expect(user.refreshTokenHash).toBe('token_hash');

      user.clearRefreshToken();
      expect(user.refreshTokenHash).toBeUndefined();
    });
  });

  describe('toObject', () => {
    it('should convert user to full object', () => {
      const user = User.create(validUserProps);
      const obj = user.toObject();

      expect(obj.id).toBe(validUserProps.id);
      expect(obj.email).toBe(validUserProps.email);
      expect(obj.passwordHash).toBe(validUserProps.passwordHash);
      expect(obj.firstName).toBe(validUserProps.firstName);
      expect(obj.lastName).toBe(validUserProps.lastName);
      expect(obj.role).toBe(Role.CUSTOMER);
      expect(obj.isActive).toBe(true);
    });
  });

  describe('isLocked', () => {
    it('should return false when lockedUntil is undefined', () => {
      const user = User.create(validUserProps);
      expect(user.isLocked).toBe(false);
    });

    it('should return false when lock has expired', () => {
      const user = User.reconstitute({
        ...validUserProps,
        role: Role.CUSTOMER,
        isActive: true,
        isEmailVerified: false,
        failedLoginAttempts: 5,
        lockedUntil: new Date('2020-01-01'), // Past date
        passwordChangedAt: new Date(),
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(user.isLocked).toBe(false);
    });
  });
});
