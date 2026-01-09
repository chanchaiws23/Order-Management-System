import { Product, ProductProps } from '../../domain/entities/Product';
import { IProductRepository, ProductSearchCriteria } from '../../domain/repositories/IProductRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface ProductRow {
  id: string;
  category_id: string | null;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: string;
  compare_at_price: string | null;
  cost_price: string | null;
  currency: string;
  stock_quantity: number;
  low_stock_threshold: number;
  weight: string | null;
  width: string | null;
  height: string | null;
  length: string | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  tags: string[] | null;
  attributes: Record<string, string> | null;
  is_active: boolean;
  is_featured: boolean;
  is_digital: boolean;
  tax_class: string;
  meta_title: string | null;
  meta_description: string | null;
  view_count: number;
  sold_count: number;
  rating_average: string;
  rating_count: number;
  created_at: Date;
  updated_at: Date;
}

export class PostgresProductRepository implements IProductRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async save(product: Product): Promise<void> {
    const p = product.toObject();
    await this.db.query(
      `INSERT INTO products (id, category_id, sku, name, slug, description, short_description, price, compare_at_price, cost_price, currency, stock_quantity, low_stock_threshold, weight, width, height, length, image_url, gallery_urls, tags, attributes, is_active, is_featured, is_digital, tax_class, meta_title, meta_description, view_count, sold_count, rating_average, rating_count, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)
       ON CONFLICT (id) DO UPDATE SET
         category_id=EXCLUDED.category_id, sku=EXCLUDED.sku, name=EXCLUDED.name, slug=EXCLUDED.slug,
         description=EXCLUDED.description, short_description=EXCLUDED.short_description, price=EXCLUDED.price,
         compare_at_price=EXCLUDED.compare_at_price, cost_price=EXCLUDED.cost_price, stock_quantity=EXCLUDED.stock_quantity,
         low_stock_threshold=EXCLUDED.low_stock_threshold, weight=EXCLUDED.weight, width=EXCLUDED.width,
         height=EXCLUDED.height, length=EXCLUDED.length, image_url=EXCLUDED.image_url, gallery_urls=EXCLUDED.gallery_urls,
         tags=EXCLUDED.tags, attributes=EXCLUDED.attributes, is_active=EXCLUDED.is_active, is_featured=EXCLUDED.is_featured,
         meta_title=EXCLUDED.meta_title, meta_description=EXCLUDED.meta_description, view_count=EXCLUDED.view_count,
         sold_count=EXCLUDED.sold_count, rating_average=EXCLUDED.rating_average, rating_count=EXCLUDED.rating_count, updated_at=EXCLUDED.updated_at`,
      [p.id, p.categoryId||null, p.sku, p.name, p.slug, p.description||null, p.shortDescription||null,
       p.price, p.compareAtPrice||null, p.costPrice||null, p.currency, p.stockQuantity, p.lowStockThreshold,
       p.weight||null, p.width||null, p.height||null, p.length||null, p.imageUrl||null,
       p.galleryUrls ? JSON.stringify(p.galleryUrls) : null, p.tags||null, p.attributes ? JSON.stringify(p.attributes) : null,
       p.isActive, p.isFeatured, p.isDigital, p.taxClass, p.metaTitle||null, p.metaDescription||null,
       p.viewCount, p.soldCount, p.ratingAverage, p.ratingCount, p.createdAt, p.updatedAt]
    );
  }

  async findById(id: string): Promise<Product | null> {
    const result = await this.db.query<ProductRow>('SELECT * FROM products WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const result = await this.db.query<ProductRow>('SELECT * FROM products WHERE sku = $1', [sku]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const result = await this.db.query<ProductRow>('SELECT * FROM products WHERE slug = $1', [slug]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findByCategory(categoryId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Product>> {
    return this.search({ categoryId, isActive: true }, pagination);
  }

  async findFeatured(limit: number = 10): Promise<Product[]> {
    const result = await this.db.query<ProductRow>(
      'SELECT * FROM products WHERE is_featured = true AND is_active = true ORDER BY created_at DESC LIMIT $1', [limit]
    );
    return result.rows.map(row => this.toDomain(row));
  }

  async findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Product>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM products WHERE is_active = true');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<ProductRow>(
      'SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async search(criteria: ProductSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<Product>> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (criteria.categoryId) { conditions.push(`category_id = $${idx++}`); params.push(criteria.categoryId); }
    if (criteria.name) { conditions.push(`name ILIKE $${idx++}`); params.push(`%${criteria.name}%`); }
    if (criteria.minPrice !== undefined) { conditions.push(`price >= $${idx++}`); params.push(criteria.minPrice); }
    if (criteria.maxPrice !== undefined) { conditions.push(`price <= $${idx++}`); params.push(criteria.maxPrice); }
    if (criteria.isActive !== undefined) { conditions.push(`is_active = $${idx++}`); params.push(criteria.isActive); }
    if (criteria.isFeatured !== undefined) { conditions.push(`is_featured = $${idx++}`); params.push(criteria.isFeatured); }
    if (criteria.inStock) { conditions.push(`stock_quantity > 0`); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await this.db.query<{ count: string }>(`SELECT COUNT(*) FROM products ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const result = await this.db.query<ProductRow>(
      `SELECT * FROM products ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM products WHERE id = $1', [id]);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM products WHERE id = $1)', [id]);
    return result.rows[0].exists;
  }

  async count(): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM products');
    return parseInt(result.rows[0].count, 10);
  }

  async countByCategory(categoryId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM products WHERE category_id = $1', [categoryId]);
    return parseInt(result.rows[0].count, 10);
  }

  private toDomain(row: ProductRow): Product {
    const props: ProductProps = {
      id: row.id, categoryId: row.category_id ?? undefined, sku: row.sku, name: row.name, slug: row.slug,
      description: row.description ?? undefined, shortDescription: row.short_description ?? undefined,
      price: parseFloat(row.price), compareAtPrice: row.compare_at_price ? parseFloat(row.compare_at_price) : undefined,
      costPrice: row.cost_price ? parseFloat(row.cost_price) : undefined, currency: row.currency,
      stockQuantity: row.stock_quantity, lowStockThreshold: row.low_stock_threshold,
      weight: row.weight ? parseFloat(row.weight) : undefined, width: row.width ? parseFloat(row.width) : undefined,
      height: row.height ? parseFloat(row.height) : undefined, length: row.length ? parseFloat(row.length) : undefined,
      imageUrl: row.image_url ?? undefined, galleryUrls: row.gallery_urls ?? undefined,
      tags: row.tags ?? undefined, attributes: row.attributes ?? undefined,
      isActive: row.is_active, isFeatured: row.is_featured, isDigital: row.is_digital, taxClass: row.tax_class,
      metaTitle: row.meta_title ?? undefined, metaDescription: row.meta_description ?? undefined,
      viewCount: row.view_count, soldCount: row.sold_count,
      ratingAverage: parseFloat(row.rating_average), ratingCount: row.rating_count,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    };
    return Product.reconstitute(props);
  }
}
