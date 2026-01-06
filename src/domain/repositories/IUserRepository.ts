import { User } from '../entities/User';
import { Role } from '../value-objects/Role';
import { PaginationOptions, PaginatedResult } from './IOrderRepository';

export interface UserSearchCriteria {
  email?: string;
  name?: string;
  role?: Role;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

export interface IUserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByRefreshToken(tokenHash: string): Promise<User | null>;
  findAll(pagination?: PaginationOptions): Promise<PaginatedResult<User>>;
  search(criteria: UserSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<User>>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  count(): Promise<number>;
  countByRole(role: Role): Promise<number>;
}
