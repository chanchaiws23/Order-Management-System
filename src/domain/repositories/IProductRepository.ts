import { Product } from '../entities/Product';
import { PaginationOptions, PaginatedResult } from './IOrderRepository';

export interface ProductSearchCriteria {
  categoryId?: string;
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  inStock?: boolean;
  tags?: string[];
}

export interface IProductRepository {
  save(product: Product): Promise<void>;
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  findByCategory(categoryId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Product>>;
  findFeatured(limit?: number): Promise<Product[]>;
  findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Product>>;
  search(criteria: ProductSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<Product>>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  count(): Promise<number>;
  countByCategory(categoryId: string): Promise<number>;
}
