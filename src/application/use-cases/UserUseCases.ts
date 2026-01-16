import { User } from '../../domain/entities/User';
import { Role } from '../../domain/value-objects/Role';
import { IUserRepository, UserSearchCriteria } from '../../domain/repositories/IUserRepository';
import { IAuditLogRepository } from '../../domain/repositories/IAuditLogRepository';
import { IPasswordHasher } from '../../infrastructure/security/PasswordHasher';
import { AuditLog, AuditAction } from '../../domain/entities/AuditLog';
import { IdGenerator } from './CreateOrderUseCase';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';

export interface CreateUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  role?: Role;
  isActive?: boolean;
}

export class UserUseCases {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly auditRepo: IAuditLogRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly idGenerator: IdGenerator
  ) {}

  async getAllUsers(
    pagination?: PaginationOptions,
    adminUserId?: string
  ): Promise<PaginatedResult<User>> {
    const result = await this.userRepo.findAll(pagination);

    if (adminUserId) {
      await this.logAudit({
        userId: adminUserId,
        action: 'DATA_EXPORT',
        description: `Admin viewed users list (page ${pagination?.page || 1})`,
        ipAddress: 'system',
        success: true,
      });
    }

    return result;
  }

  async getUserById(id: string, requestingUserId?: string): Promise<User | null> {
    const user = await this.userRepo.findById(id);

    if (user && requestingUserId && requestingUserId !== id) {
      await this.logAudit({
        userId: requestingUserId,
        action: 'DATA_EXPORT',
        description: `Admin viewed user profile: ${user.email}`,
        ipAddress: 'system',
        success: true,
      });
    }

    return user;
  }

  async searchUsers(
    criteria: UserSearchCriteria,
    pagination?: PaginationOptions,
    adminUserId?: string
  ): Promise<PaginatedResult<User>> {
    const result = await this.userRepo.search(criteria, pagination);

    if (adminUserId) {
      await this.logAudit({
        userId: adminUserId,
        action: 'DATA_EXPORT',
        description: `Admin searched users with criteria: ${JSON.stringify(criteria)}`,
        ipAddress: 'system',
        success: true,
      });
    }

    return result;
  }

  async createUser(dto: CreateUserDTO, ipAddress: string, adminUserId: string): Promise<User> {
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
      userId: adminUserId,
      action: 'USER_CREATED',
      description: `Admin created user: ${user.email} with role ${user.role}`,
      ipAddress,
      success: true,
      metadata: { targetUserId: user.id, targetUserEmail: user.email, role: user.role },
    });

    return user;
  }

  async updateUser(
    id: string,
    dto: UpdateUserDTO,
    ipAddress: string,
    adminUserId: string
  ): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const changes: string[] = [];

    if (dto.firstName || dto.lastName) {
      user.updateProfile({
        firstName: dto.firstName,
        lastName: dto.lastName,
      });
      changes.push('profile updated');
    }

    if (dto.role !== undefined && dto.role !== user.role) {
      const oldRole = user.role;
      user.updateRole(dto.role);
      changes.push(`role changed from ${oldRole} to ${dto.role}`);

      await this.logAudit({
        userId: adminUserId,
        action: 'ROLE_CHANGED',
        severity: 'WARNING',
        description: `Admin changed user ${user.email} role from ${oldRole} to ${dto.role}`,
        ipAddress,
        success: true,
        metadata: { targetUserId: id, oldRole, newRole: dto.role },
      });
    }

    if (dto.isActive !== undefined && dto.isActive !== user.isActive) {
      if (dto.isActive) {
        user.activate();
        changes.push('account activated');
      } else {
        user.deactivate();
        changes.push('account deactivated');
      }
    }

    await this.userRepo.save(user);

    await this.logAudit({
      userId: adminUserId,
      action: 'USER_UPDATED',
      description: `Admin updated user ${user.email}: ${changes.join(', ')}`,
      ipAddress,
      success: true,
      metadata: { targetUserId: id, changes },
    });

    return user;
  }

  async deleteUser(id: string, ipAddress: string, adminUserId: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.id === adminUserId) {
      throw new Error('Cannot delete your own account');
    }

    if (user.role === Role.SUPER_ADMIN) {
      throw new Error('Cannot delete super admin account');
    }

    const userEmail = user.email;
    await this.userRepo.delete(id);

    await this.logAudit({
      userId: adminUserId,
      action: 'USER_DELETED',
      severity: 'CRITICAL',
      description: `Admin deleted user: ${userEmail}`,
      ipAddress,
      success: true,
      metadata: { targetUserId: id, targetUserEmail: userEmail },
    });
  }

  async getUserStats(): Promise<{
    total: number;
    byRole: Record<Role, number>;
    active: number;
    inactive: number;
  }> {
    const total = await this.userRepo.count();
    const byRole: Record<Role, number> = {
      [Role.SUPER_ADMIN]: await this.userRepo.countByRole(Role.SUPER_ADMIN),
      [Role.ADMIN]: await this.userRepo.countByRole(Role.ADMIN),
      [Role.MANAGER]: await this.userRepo.countByRole(Role.MANAGER),
      [Role.STAFF]: await this.userRepo.countByRole(Role.STAFF),
      [Role.CUSTOMER]: await this.userRepo.countByRole(Role.CUSTOMER),
    };

    const allUsers = await this.userRepo.findAll({ page: 1, limit: 10000 });
    const active = allUsers.data.filter(u => u.isActive).length;
    const inactive = allUsers.data.filter(u => !u.isActive).length;

    return { total, byRole, active, inactive };
  }

  private async logAudit(data: {
    userId?: string;
    userEmail?: string;
    action: AuditAction;
    severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    description: string;
    ipAddress: string;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const auditLog = AuditLog.create({
      id: this.idGenerator.generate(),
      severity: data.severity || 'INFO',
      ...data,
    });
    await this.auditRepo.save(auditLog);
  }
}
