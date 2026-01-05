import { Category } from '../entities/Category';

export interface ICategoryRepository {
  save(category: Category): Promise<void>;
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  findByParentId(parentId: string | null): Promise<Category[]>;
  findAll(): Promise<Category[]>;
  findActive(): Promise<Category[]>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  existsBySlug(slug: string): Promise<boolean>;
  count(): Promise<number>;
}
