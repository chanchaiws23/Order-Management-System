import { Review, ReviewProps } from '../../domain/entities/Review';
import { IReviewRepository } from '../../domain/repositories/IReviewRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface ReviewRow {
  id: string;
  product_id: string;
  customer_id: string | null;
  order_id: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  images: string[] | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  helpful_count: number;
  created_at: Date;
  updated_at: Date;
}

export class PostgresReviewRepository implements IReviewRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async save(review: Review): Promise<void> {
    const p = review.toObject();
    await this.db.query(
      `INSERT INTO reviews (id, product_id, customer_id, order_id, rating, title, content, images, is_verified_purchase, is_approved, helpful_count, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         rating=EXCLUDED.rating, title=EXCLUDED.title, content=EXCLUDED.content, images=EXCLUDED.images,
         is_approved=EXCLUDED.is_approved, helpful_count=EXCLUDED.helpful_count, updated_at=EXCLUDED.updated_at`,
      [p.id, p.productId, p.customerId||null, p.orderId||null, p.rating, p.title||null, p.content||null,
       p.images ? JSON.stringify(p.images) : null, p.isVerifiedPurchase, p.isApproved, p.helpfulCount, p.createdAt, p.updatedAt]
    );
  }

  async findById(id: string): Promise<Review | null> {
    const result = await this.db.query<ReviewRow>('SELECT * FROM reviews WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findByProductId(productId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Review>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM reviews WHERE product_id = $1', [productId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<ReviewRow>(
      'SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [productId, limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByCustomerId(customerId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Review>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM reviews WHERE customer_id = $1', [customerId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<ReviewRow>(
      'SELECT * FROM reviews WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [customerId, limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findApproved(productId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Review>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) FROM reviews WHERE product_id = $1 AND is_approved = true', [productId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<ReviewRow>(
      'SELECT * FROM reviews WHERE product_id = $1 AND is_approved = true ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [productId, limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPendingApproval(pagination?: PaginationOptions): Promise<PaginatedResult<Review>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM reviews WHERE is_approved = false');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<ReviewRow>(
      'SELECT * FROM reviews WHERE is_approved = false ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Review>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM reviews');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<ReviewRow>('SELECT * FROM reviews ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM reviews WHERE id = $1', [id]);
  }

  async count(): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM reviews');
    return parseInt(result.rows[0].count, 10);
  }

  async countByProductId(productId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM reviews WHERE product_id = $1', [productId]);
    return parseInt(result.rows[0].count, 10);
  }

  async getAverageRating(productId: string): Promise<number> {
    const result = await this.db.query<{ avg: string | null }>(
      'SELECT AVG(rating) FROM reviews WHERE product_id = $1 AND is_approved = true', [productId]
    );
    return result.rows[0].avg ? parseFloat(result.rows[0].avg) : 0;
  }

  private toDomain(row: ReviewRow): Review {
    const props: ReviewProps = {
      id: row.id, productId: row.product_id, customerId: row.customer_id ?? undefined, orderId: row.order_id ?? undefined,
      rating: row.rating, title: row.title ?? undefined, content: row.content ?? undefined, images: row.images ?? undefined,
      isVerifiedPurchase: row.is_verified_purchase, isApproved: row.is_approved, helpfulCount: row.helpful_count,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    };
    return Review.reconstitute(props);
  }
}
