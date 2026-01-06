import { User } from '../../../src/domain/entities/User';
import { Role } from '../../../src/domain/value-objects/Role';
import { IUserRepository, UserSearchCriteria } from '../../../src/domain/repositories/IUserRepository';
import { PaginationOptions, PaginatedResult } from '../../../src/domain/repositories/IOrderRepository';

export class MockUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async findByRefreshToken(tokenHash: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.refreshTokenHash === tokenHash) {
        return user;
      }
    }
    return null;
  }

  async findAll(pagination?: PaginationOptions): Promise<PaginatedResult<User>> {
    const allUsers = Array.from(this.users.values());
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const start = (page - 1) * limit;
    const data = allUsers.slice(start, start + limit);

    return {
      data,
      total: allUsers.length,
      page,
      limit,
      totalPages: Math.ceil(allUsers.length / limit),
    };
  }

  async search(criteria: UserSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<User>> {
    let filtered = Array.from(this.users.values());

    if (criteria.email) {
      filtered = filtered.filter(u => u.email.includes(criteria.email!));
    }
    if (criteria.role) {
      filtered = filtered.filter(u => u.role === criteria.role);
    }
    if (criteria.isActive !== undefined) {
      filtered = filtered.filter(u => u.isActive === criteria.isActive);
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return {
      data,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.users.has(id);
  }

  async existsByEmail(email: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return true;
      }
    }
    return false;
  }

  async count(): Promise<number> {
    return this.users.size;
  }

  async countByRole(role: Role): Promise<number> {
    let count = 0;
    for (const user of this.users.values()) {
      if (user.role === role) {
        count++;
      }
    }
    return count;
  }

  // Test helper methods
  clear(): void {
    this.users.clear();
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }
}
