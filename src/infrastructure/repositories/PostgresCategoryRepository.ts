import { Category, CategoryProps } from '../../domain/entities/Category';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface CategoryRow {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export class PostgresCategoryRepository implements ICategoryRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async save(category: Category): Promise<void> {
    const p = category.toObject();
    await this.db.query(
      `INSERT INTO categories (id, parent_id, name, slug, description, image_url, is_active, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         parent_id=EXCLUDED.parent_id, name=EXCLUDED.name, slug=EXCLUDED.slug, description=EXCLUDED.description,
         image_url=EXCLUDED.image_url, is_active=EXCLUDED.is_active, sort_order=EXCLUDED.sort_order, updated_at=EXCLUDED.updated_at`,
      [p.id, p.parentId||null, p.name, p.slug, p.description||null, p.imageUrl||null, p.isActive, p.sortOrder, p.createdAt, p.updatedAt]
    );
  }

  async findById(id: string): Promise<Category | null> {
    const result = await this.db.query<CategoryRow>('SELECT * FROM categories WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const result = await this.db.query<CategoryRow>('SELECT * FROM categories WHERE slug = $1', [slug]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findByParentId(parentId: string | null): Promise<Category[]> {
    const result = parentId
      ? await this.db.query<CategoryRow>('SELECT * FROM categories WHERE parent_id = $1 ORDER BY sort_order', [parentId])
      : await this.db.query<CategoryRow>('SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order');
    return result.rows.map(row => this.toDomain(row));
  }

  async findAll(): Promise<Category[]> {
    const result = await this.db.query<CategoryRow>('SELECT * FROM categories ORDER BY sort_order');
    return result.rows.map(row => this.toDomain(row));
  }

  async findActive(): Promise<Category[]> {
    const result = await this.db.query<CategoryRow>('SELECT * FROM categories WHERE is_active = true ORDER BY sort_order');
    return result.rows.map(row => this.toDomain(row));
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM categories WHERE id = $1', [id]);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1)', [id]);
    return result.rows[0].exists;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM categories WHERE slug = $1)', [slug]);
    return result.rows[0].exists;
  }

  async count(): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM categories');
    return parseInt(result.rows[0].count, 10);
  }

  private toDomain(row: CategoryRow): Category {
    const props: CategoryProps = {
      id: row.id, parentId: row.parent_id ?? undefined, name: row.name, slug: row.slug,
      description: row.description ?? undefined, imageUrl: row.image_url ?? undefined,
      isActive: row.is_active, sortOrder: row.sort_order,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    };
    return Category.reconstitute(props);
  }
}
