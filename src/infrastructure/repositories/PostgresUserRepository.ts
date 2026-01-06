import { User, UserProps } from '../../domain/entities/User';
import { Role } from '../../domain/value-objects/Role';
import { IUserRepository, UserSearchCriteria } from '../../domain/repositories/IUserRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_email_verified: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  last_login_ip: string | null;
  password_changed_at: Date;
  refresh_token_hash: string | null;
  two_factor_secret: string | null;
  two_factor_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async save(user: User): Promise<void> {
    const p = user.toObject();
    await this.db.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, is_email_verified, 
        failed_login_attempts, locked_until, last_login_at, last_login_ip, password_changed_at, 
        refresh_token_hash, two_factor_secret, two_factor_enabled, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO UPDATE SET
         email=EXCLUDED.email, password_hash=EXCLUDED.password_hash, first_name=EXCLUDED.first_name,
         last_name=EXCLUDED.last_name, role=EXCLUDED.role, is_active=EXCLUDED.is_active,
         is_email_verified=EXCLUDED.is_email_verified, failed_login_attempts=EXCLUDED.failed_login_attempts,
         locked_until=EXCLUDED.locked_until, last_login_at=EXCLUDED.last_login_at, last_login_ip=EXCLUDED.last_login_ip,
         password_changed_at=EXCLUDED.password_changed_at, refresh_token_hash=EXCLUDED.refresh_token_hash,
         two_factor_secret=EXCLUDED.two_factor_secret, two_factor_enabled=EXCLUDED.two_factor_enabled,
         updated_at=EXCLUDED.updated_at`,
      [p.id, p.email, p.passwordHash, p.firstName, p.lastName, p.role, p.isActive, p.isEmailVerified,
       p.failedLoginAttempts, p.lockedUntil || null, p.lastLoginAt || null, p.lastLoginIp || null,
       p.passwordChangedAt, p.refreshTokenHash || null, p.twoFactorSecret || null, p.twoFactorEnabled,
       p.createdAt, p.updatedAt]
    );
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query<UserRow>('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findByRefreshToken(tokenHash: string): Promise<User | null> {
    const result = await this.db.query<UserRow>('SELECT * FROM users WHERE refresh_token_hash = $1', [tokenHash]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findAll(pagination?: PaginationOptions): Promise<PaginatedResult<User>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<UserRow>(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async search(criteria: UserSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<User>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (criteria.email) { conditions.push(`email ILIKE $${idx++}`); params.push(`%${criteria.email}%`); }
    if (criteria.name) { conditions.push(`(first_name ILIKE $${idx} OR last_name ILIKE $${idx++})`); params.push(`%${criteria.name}%`); }
    if (criteria.role) { conditions.push(`role = $${idx++}`); params.push(criteria.role); }
    if (criteria.isActive !== undefined) { conditions.push(`is_active = $${idx++}`); params.push(criteria.isActive); }
    if (criteria.isEmailVerified !== undefined) { conditions.push(`is_email_verified = $${idx++}`); params.push(criteria.isEmailVerified); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.db.query<{ count: string }>(`SELECT COUNT(*) FROM users ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const result = await this.db.query<UserRow>(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM users WHERE id = $1', [id]);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)', [id]);
    return result.rows[0].exists;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER($1))', [email]);
    return result.rows[0].exists;
  }

  async count(): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count, 10);
  }

  async countByRole(role: Role): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM users WHERE role = $1', [role]);
    return parseInt(result.rows[0].count, 10);
  }

  private toDomain(row: UserRow): User {
    const props: UserProps = {
      id: row.id, email: row.email, passwordHash: row.password_hash,
      firstName: row.first_name, lastName: row.last_name, role: row.role as Role,
      isActive: row.is_active, isEmailVerified: row.is_email_verified,
      failedLoginAttempts: row.failed_login_attempts, lockedUntil: row.locked_until ?? undefined,
      lastLoginAt: row.last_login_at ?? undefined, lastLoginIp: row.last_login_ip ?? undefined,
      passwordChangedAt: new Date(row.password_changed_at), refreshTokenHash: row.refresh_token_hash ?? undefined,
      twoFactorSecret: row.two_factor_secret ?? undefined, twoFactorEnabled: row.two_factor_enabled,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    };
    return User.reconstitute(props);
  }
}
