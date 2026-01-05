import { Customer, CustomerProps } from '../../domain/entities/Customer';
import { CustomerTier } from '../../domain/value-objects/CustomerTier';
import { ICustomerRepository, CustomerSearchCriteria } from '../../domain/repositories/ICustomerRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface CustomerRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: Date | null;
  gender: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  loyalty_points: number;
  tier: string;
  created_at: Date;
  updated_at: Date;
}

export class PostgresCustomerRepository implements ICustomerRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async save(customer: Customer): Promise<void> {
    const props = customer.toObject();
    await this.db.query(
      `INSERT INTO customers (id, email, first_name, last_name, phone, date_of_birth, gender, avatar_url, is_active, is_verified, loyalty_points, tier, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
         phone = EXCLUDED.phone, date_of_birth = EXCLUDED.date_of_birth, gender = EXCLUDED.gender,
         avatar_url = EXCLUDED.avatar_url, is_active = EXCLUDED.is_active, is_verified = EXCLUDED.is_verified,
         loyalty_points = EXCLUDED.loyalty_points, tier = EXCLUDED.tier, updated_at = EXCLUDED.updated_at`,
      [props.id, props.email, props.firstName, props.lastName, props.phone || null,
       props.dateOfBirth || null, props.gender || null, props.avatarUrl || null,
       props.isActive, props.isVerified, props.loyaltyPoints, props.tier,
       props.createdAt, props.updatedAt]
    );
  }

  async findById(id: string): Promise<Customer | null> {
    const result = await this.db.query<CustomerRow>('SELECT * FROM customers WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const result = await this.db.query<CustomerRow>('SELECT * FROM customers WHERE email = $1', [email]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Customer>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM customers');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<CustomerRow>(
      'SELECT * FROM customers ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]
    );

    return {
      data: result.rows.map(row => this.toDomain(row)),
      total, page, limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async search(criteria: CustomerSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<Customer>> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.email) { conditions.push(`email ILIKE $${paramIndex++}`); params.push(`%${criteria.email}%`); }
    if (criteria.name) { conditions.push(`(first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex++})`); params.push(`%${criteria.name}%`); }
    if (criteria.tier) { conditions.push(`tier = $${paramIndex++}`); params.push(criteria.tier); }
    if (criteria.isActive !== undefined) { conditions.push(`is_active = $${paramIndex++}`); params.push(criteria.isActive); }
    if (criteria.isVerified !== undefined) { conditions.push(`is_verified = $${paramIndex++}`); params.push(criteria.isVerified); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.db.query<{ count: string }>(`SELECT COUNT(*) FROM customers ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const result = await this.db.query<CustomerRow>(
      `SELECT * FROM customers ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return {
      data: result.rows.map(row => this.toDomain(row)),
      total, page, limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM customers WHERE id = $1', [id]);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM customers WHERE id = $1)', [id]);
    return result.rows[0].exists;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM customers WHERE email = $1)', [email]);
    return result.rows[0].exists;
  }

  async count(): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM customers');
    return parseInt(result.rows[0].count, 10);
  }

  private toDomain(row: CustomerRow): Customer {
    const props: CustomerProps = {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone ?? undefined,
      dateOfBirth: row.date_of_birth ?? undefined,
      gender: row.gender ?? undefined,
      avatarUrl: row.avatar_url ?? undefined,
      isActive: row.is_active,
      isVerified: row.is_verified,
      loyaltyPoints: row.loyalty_points,
      tier: row.tier as CustomerTier,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
    return Customer.reconstitute(props);
  }
}
