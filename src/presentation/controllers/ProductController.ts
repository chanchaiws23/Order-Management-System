import { Request, Response, NextFunction } from 'express';
import { ProductUseCases } from '../../application/use-cases/ProductUseCases';
import { LogExecutionTime } from '../decorators/LogExecutionTime';

export class ProductController {
  constructor(private readonly productUseCases: ProductUseCases) {}

  createProduct = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const product = await this.productUseCases.createProduct(req.body);
        res.status(201).json({ success: true, data: product.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getProduct = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const product = await this.productUseCases.getProductById(req.params.id);
        if (!product) {
          res.status(404).json({ success: false, error: 'Product not found' });
          return;
        }
        res.json({ success: true, data: product.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getProductBySlug = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const product = await this.productUseCases.getProductBySlug(req.params.slug);
        if (!product) {
          res.status(404).json({ success: false, error: 'Product not found' });
          return;
        }
        res.json({ success: true, data: product.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  updateProduct = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const product = await this.productUseCases.updateProduct(req.params.id, req.body);
        res.json({ success: true, data: product.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  deleteProduct = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        await this.productUseCases.deleteProduct(req.params.id);
        res.json({ success: true, message: 'Product deleted' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  searchProducts = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { categoryId, name, minPrice, maxPrice, isActive, isFeatured, inStock, page, limit } = req.query;
        const result = await this.productUseCases.searchProducts(
          { categoryId: categoryId as string, name: name as string,
            minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
            isActive: isActive !== undefined ? isActive === 'true' : true,
            isFeatured: isFeatured === 'true' ? true : undefined,
            inStock: inStock === 'true' ? true : undefined },
          { page: parseInt(page as string) || 1, limit: parseInt(limit as string) || 10 }
        );
        res.json({ success: true, ...result, data: result.data.map(p => p.toObject()) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getFeaturedProducts = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const limit = parseInt(req.query.limit as string) || 10;
        const products = await this.productUseCases.getFeaturedProducts(limit);
        res.json({ success: true, data: products.map(p => p.toObject()) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  adjustStock = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { quantity } = req.body;
        const product = await this.productUseCases.adjustStock(req.params.id, quantity);
        res.json({ success: true, data: product.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  createCategory = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const category = await this.productUseCases.createCategory(req.body);
        res.status(201).json({ success: true, data: category.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getAllCategories = LogExecutionTime()(
    async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const categories = await this.productUseCases.getAllCategories();
        res.json({ success: true, data: categories.map(c => c.toObject()) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getCategory = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const category = await this.productUseCases.getCategoryById(req.params.id);
        if (!category) {
          res.status(404).json({ success: false, error: 'Category not found' });
          return;
        }
        res.json({ success: true, data: category.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  updateCategory = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const category = await this.productUseCases.updateCategory(req.params.id, req.body);
        res.json({ success: true, data: category.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  deleteCategory = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        await this.productUseCases.deleteCategory(req.params.id);
        res.json({ success: true, message: 'Category deleted' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );
}
