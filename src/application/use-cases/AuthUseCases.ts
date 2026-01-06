import { User } from '../../domain/entities/User';
import { AuditLog, AuditAction } from '../../domain/entities/AuditLog';
import { Role } from '../../domain/value-objects/Role';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IAuditLogRepository } from '../../domain/repositories/IAuditLogRepository';
import { IPasswordHasher } from '../../infrastructure/security/PasswordHasher';
import { IJwtService, TokenPair, TokenPayload } from '../../infrastructure/security/JwtService';
import { IdGenerator } from './CreateOrderUseCase';

export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
}

export interface LoginDTO {
  email: string;
  password: string;
  ipAddress: string;
  userAgent?: string;
}

export interface LoginResult {
  user: Omit<User, 'passwordHash' | 'refreshTokenHash' | 'twoFactorSecret'>;
  tokens: TokenPair;
}

export interface ChangePasswordDTO {
  userId: string;
  currentPassword: string;
  newPassword: string;
  ipAddress: string;
}

export class AuthUseCases {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly auditRepo: IAuditLogRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly jwtService: IJwtService,
    private readonly idGenerator: IdGenerator
  ) {}

  async register(dto: RegisterDTO, ipAddress: string): Promise<User> {
    const existingUser = await this.userRepo.findByEmail(dto.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const passwordCheck = this.passwordHasher.isStrongPassword(dto.password);
    if (!passwordCheck.valid) {
      throw new Error(`Weak password: ${passwordCheck.errors.join(', ')}`);
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = User.create({
      id: this.idGenerator.generate(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role: dto.role,
    });

    await this.userRepo.save(user);

    await this.logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_CREATED',
      description: `User registered: ${user.email}`,
      ipAddress,
      success: true,
    });

    return user;
  }

  async login(dto: LoginDTO): Promise<LoginResult> {
    const user = await this.userRepo.findByEmail(dto.email);
    
    if (!user) {
      await this.logAudit({
        userEmail: dto.email,
        action: 'LOGIN_FAILED',
        severity: 'WARNING',
        description: 'Login failed: user not found',
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        success: false,
        errorMessage: 'Invalid credentials',
      });
      throw new Error('Invalid credentials');
    }

    if (!user.canLogin) {
      const reason = user.isLocked ? 'Account is locked' : 'Account is inactive';
      await this.logAudit({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN_FAILED',
        severity: 'WARNING',
        description: `Login failed: ${reason}`,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        success: false,
        errorMessage: reason,
      });
      throw new Error(reason);
    }

    const isValidPassword = await this.passwordHasher.verify(dto.password, user.passwordHash);
    
    if (!isValidPassword) {
      user.recordFailedLogin();
      await this.userRepo.save(user);

      const severity = user.failedLoginAttempts >= 3 ? 'WARNING' : 'INFO';
      await this.logAudit({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGIN_FAILED',
        severity,
        description: `Login failed: invalid password (attempt ${user.failedLoginAttempts})`,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        success: false,
        errorMessage: 'Invalid credentials',
      });

      if (user.isLocked) {
        await this.logAudit({
          userId: user.id,
          userEmail: user.email,
          action: 'USER_LOCKED',
          severity: 'CRITICAL',
          description: 'Account locked due to too many failed login attempts',
          ipAddress: dto.ipAddress,
          success: true,
        });
      }

      throw new Error('Invalid credentials');
    }

    user.recordSuccessfulLogin(dto.ipAddress);
    const tokens = this.jwtService.generateTokenPair(user.id, user.email, user.role);
    user.setRefreshToken(this.jwtService.hashToken(tokens.refreshToken));
    await this.userRepo.save(user);

    await this.logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN_SUCCESS',
      description: 'User logged in successfully',
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      success: true,
    });

    return { user: user.toSafeObject() as any, tokens };
  }

  async logout(userId: string, ipAddress: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (user) {
      user.clearRefreshToken();
      await this.userRepo.save(user);

      await this.logAudit({
        userId: user.id,
        userEmail: user.email,
        action: 'LOGOUT',
        description: 'User logged out',
        ipAddress,
        success: true,
      });
    }
  }

  async refreshTokens(refreshToken: string, ipAddress: string): Promise<TokenPair> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    const tokenHash = this.jwtService.hashToken(refreshToken);
    const user = await this.userRepo.findByRefreshToken(tokenHash);
    
    if (!user || user.id !== payload.userId) {
      throw new Error('Invalid refresh token');
    }

    if (!user.canLogin) {
      throw new Error('Account is not active');
    }

    const tokens = this.jwtService.generateTokenPair(user.id, user.email, user.role);
    user.setRefreshToken(this.jwtService.hashToken(tokens.refreshToken));
    await this.userRepo.save(user);

    return tokens;
  }

  async changePassword(dto: ChangePasswordDTO): Promise<void> {
    const user = await this.userRepo.findById(dto.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await this.passwordHasher.verify(dto.currentPassword, user.passwordHash);
    if (!isValidPassword) {
      await this.logAudit({
        userId: user.id,
        userEmail: user.email,
        action: 'PASSWORD_CHANGE',
        severity: 'WARNING',
        description: 'Password change failed: invalid current password',
        ipAddress: dto.ipAddress,
        success: false,
      });
      throw new Error('Current password is incorrect');
    }

    const passwordCheck = this.passwordHasher.isStrongPassword(dto.newPassword);
    if (!passwordCheck.valid) {
      throw new Error(`Weak password: ${passwordCheck.errors.join(', ')}`);
    }

    const newHash = await this.passwordHasher.hash(dto.newPassword);
    user.changePassword(newHash);
    await this.userRepo.save(user);

    await this.logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'PASSWORD_CHANGE',
      description: 'Password changed successfully',
      ipAddress: dto.ipAddress,
      success: true,
    });
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    return this.jwtService.verifyAccessToken(token);
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userRepo.findById(userId);
  }

  private async logAudit(data: {
    userId?: string;
    userEmail?: string;
    action: AuditAction;
    severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    description: string;
    ipAddress: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    const auditLog = AuditLog.create({
      id: this.idGenerator.generate(),
      ...data,
    });
    await this.auditRepo.save(auditLog);
  }
}
