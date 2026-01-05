import { Coupon, CouponProps, DiscountType } from '../../domain/entities/Coupon';
import { ICouponRepository } from '../../domain/repositories/ICouponRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface CouponRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: string;
  minimum_order_amount: string;
  maximum_discount: string | null;
  usage_limit: number | null;
  usage_count: number;
  usage_limit_per_customer: number;
  is_active: boolean;
  starts_at: Date | null;
  expires_at: Date | null;
  applicable_products: string[] | null;
  applicable_categories: string[] | null;
  created_at: Date;
  updated_at: Date;
}

export class PostgresCouponRepository implements ICouponRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async save(coupon: Coupon): Promise<void> {
    const p = coupon.toObject();
    await this.db.query(
      `INSERT INTO coupons (id, code, name, description, discount_type, discount_value, minimum_order_amount, maximum_discount, usage_limit, usage_count, usage_limit_per_customer, is_active, starts_at, expires_at, applicable_products, applicable_categories, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, description=EXCLUDED.description, discount_type=EXCLUDED.discount_type,
         discount_value=EXCLUDED.discount_value, minimum_order_amount=EXCLUDED.minimum_order_amount,
         maximum_discount=EXCLUDED.maximum_discount, usage_limit=EXCLUDED.usage_limit, usage_count=EXCLUDED.usage_count,
         usage_limit_per_customer=EXCLUDED.usage_limit_per_customer, is_active=EXCLUDED.is_active,
         starts_at=EXCLUDED.starts_at, expires_at=EXCLUDED.expires_at, applicable_products=EXCLUDED.applicable_products,
         applicable_categories=EXCLUDED.applicable_categories, updated_at=EXCLUDED.updated_at`,
      [p.id, p.code, p.name, p.description||null, p.discountType, p.discountValue, p.minimumOrderAmount,
       p.maximumDiscount||null, p.usageLimit||null, p.usageCount, p.usageLimitPerCustomer, p.isActive,
       p.startsAt||null, p.expiresAt||null,
       p.applicableProducts ? JSON.stringify(p.applicableProducts) : null,
       p.applicableCategories ? JSON.stringify(p.applicableCategories) : null,
       p.createdAt, p.updatedAt]
    );
  }

  async findById(id: string): Promise<Coupon | null> {
    const result = await this.db.query<CouponRow>('SELECT * FROM coupons WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const result = await this.db.query<CouponRow>('SELECT * FROM coupons WHERE code = $1', [code.toUpperCase()]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findActive(pagination?: PaginationOptions): Promise<PaginatedResult<Coupon>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) FROM coupons WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())`
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<CouponRow>(
      `SELECT * FROM coupons WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Coupon>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM coupons');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<CouponRow>('SELECT * FROM coupons ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM coupons WHERE id = $1', [id]);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM coupons WHERE id = $1)', [id]);
    return result.rows[0].exists;
  }

  async existsByCode(code: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM coupons WHERE code = $1)', [code.toUpperCase()]);
    return result.rows[0].exists;
  }

  async count(): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM coupons');
    return parseInt(result.rows[0].count, 10);
  }

  private toDomain(row: CouponRow): Coupon {
    const props: CouponProps = {
      id: row.id, code: row.code, name: row.name, description: row.description ?? undefined,
      discountType: row.discount_type as DiscountType, discountValue: parseFloat(row.discount_value),
      minimumOrderAmount: parseFloat(row.minimum_order_amount),
      maximumDiscount: row.maximum_discount ? parseFloat(row.maximum_discount) : undefined,
      usageLimit: row.usage_limit ?? undefined, usageCount: row.usage_count, usageLimitPerCustomer: row.usage_limit_per_customer,
      isActive: row.is_active, startsAt: row.starts_at ?? undefined, expiresAt: row.expires_at ?? undefined,
      applicableProducts: row.applicable_products ?? undefined, applicableCategories: row.applicable_categories ?? undefined,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    };
    return Coupon.reconstitute(props);
  }
}
