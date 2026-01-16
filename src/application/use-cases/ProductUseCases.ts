import { Product } from '../../domain/entities/Product';
import { Category } from '../../domain/entities/Category';
import { IProductRepository, ProductSearchCriteria } from '../../domain/repositories/IProductRepository';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';
import { IdGenerator } from './CreateOrderUseCase';

export interface CreateProductDTO {
  categoryId?: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  stockQuantity?: number;
  weight?: number;
  imageUrl?: string;
  galleryUrls?: string[];
  tags?: string[];
  attributes?: Record<string, string>;
  isDigital?: boolean;
}

export interface CreateCategoryDTO {
  parentId?: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export class ProductUseCases {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly categoryRepo: ICategoryRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async createProduct(dto: CreateProductDTO): Promise<Product> {
    const existingSku = await this.productRepo.findBySku(dto.sku);
    if (existingSku) {
      throw new Error('SKU already exists');
    }

    const existingSlug = await this.productRepo.findBySlug(dto.slug);
    if (existingSlug) {
      throw new Error('Slug already exists');
    }

    if (dto.categoryId) {
      const category = await this.categoryRepo.findById(dto.categoryId);
      if (!category) {
        throw new Error('Category not found');
      }
    }

    const product = Product.create({
      id: this.idGenerator.generate(),
      ...dto,
    });

    await this.productRepo.save(product);
    return product;
  }

  async getProductById(id: string): Promise<Product | null> {
    const product = await this.productRepo.findById(id);
    if (product) {
      product.incrementViewCount();
      await this.productRepo.save(product);
    }
    return product;
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const product = await this.productRepo.findBySlug(slug);
    if (product) {
      product.incrementViewCount();
      await this.productRepo.save(product);
    }
    return product;
  }

  async updateProduct(id: string, dto: Partial<CreateProductDTO & { isActive?: boolean }>): Promise<Product> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Handle isActive separately
    if (dto.isActive !== undefined) {
      if (dto.isActive) {
        product.activate();
      } else {
        product.deactivate();
      }
    }

    // Update other fields
    product.updateDetails(dto);
    await this.productRepo.save(product);
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.productRepo.delete(id);
  }

  async getAllProducts(pagination?: PaginationOptions): Promise<PaginatedResult<Product>> {
    return this.productRepo.findAll(pagination);
  }

  async searchProducts(criteria: ProductSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<Product>> {
    return this.productRepo.search(criteria, pagination);
  }

  async getFeaturedProducts(limit?: number): Promise<Product[]> {
    return this.productRepo.findFeatured(limit);
  }

  async getProductsByCategory(categoryId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Product>> {
    return this.productRepo.findByCategory(categoryId, pagination);
  }

  async adjustStock(productId: string, quantity: number): Promise<Product> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    product.adjustStock(quantity);
    await this.productRepo.save(product);
    return product;
  }

  async toggleFeatured(productId: string): Promise<Product> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.isFeatured) {
      product.unsetFeatured();
    } else {
      product.setFeatured();
    }

    await this.productRepo.save(product);
    return product;
  }

  async createCategory(dto: CreateCategoryDTO): Promise<Category> {
    const existingSlug = await this.categoryRepo.existsBySlug(dto.slug);
    if (existingSlug) {
      throw new Error('Category slug already exists');
    }

    const category = Category.create({
      id: this.idGenerator.generate(),
      ...dto,
    });

    await this.categoryRepo.save(category);
    return category;
  }

  async getAllCategories(): Promise<Category[]> {
    return this.categoryRepo.findAll();
  }

  async getActiveCategories(): Promise<Category[]> {
    return this.categoryRepo.findActive();
  }

  async getCategoryById(id: string): Promise<Category | null> {
    return this.categoryRepo.findById(id);
  }

  async updateCategory(id: string, dto: Partial<CreateCategoryDTO>): Promise<Category> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new Error('Category not found');
    }

    category.update(dto);
    await this.categoryRepo.save(category);
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const productCount = await this.productRepo.countByCategory(id);
    if (productCount > 0) {
      throw new Error('Cannot delete category with products');
    }
    await this.categoryRepo.delete(id);
  }
}
