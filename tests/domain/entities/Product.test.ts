import { Product } from '../../../src/domain/entities/Product';

describe('Product Entity', () => {
  const validProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Product',
    slug: 'test-product',
    sku: 'SKU-001',
    description: 'A test product',
    price: 99.99,
    categoryId: 'cat-123',
  };

  describe('create', () => {
    it('should create product with valid props', () => {
      const product = Product.create(validProps);

      expect(product.id).toBe(validProps.id);
      expect(product.name).toBe(validProps.name);
      expect(product.slug).toBe(validProps.slug);
      expect(product.price).toBe(99.99);
      expect(product.stockQuantity).toBe(0);
      expect(product.isActive).toBe(true);
      expect(product.isFeatured).toBe(false);
    });

    it('should throw error for empty name', () => {
      expect(() => Product.create({ ...validProps, name: '' }))
        .toThrow('Product name is required');
    });

    it('should throw error for negative price', () => {
      expect(() => Product.create({ ...validProps, price: -10 }))
        .toThrow('Price cannot be negative');
    });

    it('should throw error for empty SKU', () => {
      expect(() => Product.create({ ...validProps, sku: '' }))
        .toThrow('SKU is required');
    });
  });

  describe('adjustStock', () => {
    it('should increase stock', () => {
      const product = Product.create(validProps);

      product.adjustStock(10);
      expect(product.stockQuantity).toBe(10);

      product.adjustStock(5);
      expect(product.stockQuantity).toBe(15);
    });

    it('should decrease stock', () => {
      const product = Product.create(validProps);
      product.adjustStock(20);

      product.adjustStock(-5);
      expect(product.stockQuantity).toBe(15);
    });

    it('should throw error when stock would go negative', () => {
      const product = Product.create(validProps);
      product.adjustStock(5);

      expect(() => product.adjustStock(-10))
        .toThrow('Stock cannot be negative');
    });
  });

  describe('isInStock', () => {
    it('should return true when stock is available', () => {
      const product = Product.create(validProps);
      product.adjustStock(10);

      expect(product.isInStock).toBe(true);
    });

    it('should return false when out of stock', () => {
      const product = Product.create(validProps);

      expect(product.isInStock).toBe(false);
    });
  });

  describe('updateDetails', () => {
    it('should update price and compare at price', () => {
      const product = Product.create(validProps);

      product.updateDetails({ price: 79.99, compareAtPrice: 99.99 });

      expect(product.price).toBe(79.99);
      expect(product.compareAtPrice).toBe(99.99);
    });

    it('should update name and description', () => {
      const product = Product.create(validProps);

      product.updateDetails({ name: 'Updated Product', description: 'New description' });

      expect(product.name).toBe('Updated Product');
      expect(product.description).toBe('New description');
    });
  });

  describe('setFeatured/unsetFeatured', () => {
    it('should set featured status', () => {
      const product = Product.create(validProps);
      expect(product.isFeatured).toBe(false);

      product.setFeatured();
      expect(product.isFeatured).toBe(true);
    });

    it('should unset featured status', () => {
      const product = Product.create(validProps);
      product.setFeatured();

      product.unsetFeatured();
      expect(product.isFeatured).toBe(false);
    });
  });

  describe('activate/deactivate', () => {
    it('should deactivate product', () => {
      const product = Product.create(validProps);

      product.deactivate();
      expect(product.isActive).toBe(false);
    });

    it('should activate product', () => {
      const product = Product.create(validProps);
      product.deactivate();

      product.activate();
      expect(product.isActive).toBe(true);
    });
  });

  describe('updateRating', () => {
    it('should update average rating', () => {
      const product = Product.create(validProps);

      product.updateRating(5);
      expect(product.ratingAverage).toBe(5);
      expect(product.ratingCount).toBe(1);

      product.updateRating(4);
      expect(product.ratingAverage).toBe(4.5);
      expect(product.ratingCount).toBe(2);
    });
  });

  describe('discountPercent', () => {
    it('should calculate discount percentage', () => {
      const product = Product.create({ ...validProps, price: 80, compareAtPrice: 100 });

      expect(product.discountPercent).toBe(20);
    });

    it('should return 0 when no compare price', () => {
      const product = Product.create(validProps);

      expect(product.discountPercent).toBe(0);
    });
  });

  describe('recordSale', () => {
    it('should increment sold count', () => {
      const product = Product.create(validProps);

      product.recordSale(5);
      expect(product.soldCount).toBe(5);

      product.recordSale(3);
      expect(product.soldCount).toBe(8);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute product from props', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');
      const product = Product.reconstitute({
        ...validProps,
        stockQuantity: 50,
        lowStockThreshold: 10,
        isActive: false,
        isFeatured: true,
        isDigital: true,
        viewCount: 100,
        soldCount: 25,
        ratingAverage: 4.5,
        ratingCount: 10,
        currency: 'THB',
        taxClass: 'standard',
        createdAt,
        updatedAt,
      });

      expect(product.stockQuantity).toBe(50);
      expect(product.lowStockThreshold).toBe(10);
      expect(product.isActive).toBe(false);
      expect(product.isFeatured).toBe(true);
      expect(product.isDigital).toBe(true);
      expect(product.viewCount).toBe(100);
      expect(product.soldCount).toBe(25);
      expect(product.ratingAverage).toBe(4.5);
      expect(product.ratingCount).toBe(10);
      expect(product.currency).toBe('THB');
      expect(product.taxClass).toBe('standard');
      expect(product.createdAt).toBe(createdAt);
      expect(product.updatedAt).toBe(updatedAt);
    });
  });

  describe('getters', () => {
    it('should return all optional properties', () => {
      const product = Product.create({
        ...validProps,
        shortDescription: 'Short desc',
        costPrice: 50,
        weight: 1.5,
        width: 10,
        height: 20,
        length: 30,
        imageUrl: 'https://example.com/image.jpg',
        galleryUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        tags: ['tag1', 'tag2'],
        attributes: { color: 'red', size: 'M' },
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Description',
      });

      expect(product.categoryId).toBe('cat-123');
      expect(product.shortDescription).toBe('Short desc');
      expect(product.costPrice).toBe(50);
      expect(product.weight).toBe(1.5);
      expect(product.width).toBe(10);
      expect(product.height).toBe(20);
      expect(product.length).toBe(30);
      expect(product.imageUrl).toBe('https://example.com/image.jpg');
      expect(product.galleryUrls).toEqual(['https://example.com/img1.jpg', 'https://example.com/img2.jpg']);
      expect(product.tags).toEqual(['tag1', 'tag2']);
      expect(product.attributes).toEqual({ color: 'red', size: 'M' });
      expect(product.metaTitle).toBe('Meta Title');
      expect(product.metaDescription).toBe('Meta Description');
    });
  });

  describe('isLowStock', () => {
    it('should return true when stock is at or below threshold', () => {
      const product = Product.create({ ...validProps, lowStockThreshold: 10 });
      product.adjustStock(10);
      expect(product.isLowStock).toBe(true);

      product.adjustStock(-5);
      expect(product.isLowStock).toBe(true);
    });

    it('should return false when stock is above threshold', () => {
      const product = Product.create({ ...validProps, lowStockThreshold: 10 });
      product.adjustStock(20);
      expect(product.isLowStock).toBe(false);
    });
  });

  describe('profit', () => {
    it('should calculate profit correctly', () => {
      const product = Product.create({ ...validProps, price: 100, costPrice: 60 });
      expect(product.profit).toBe(40);
    });

    it('should return 0 when no cost price', () => {
      const product = Product.create(validProps);
      expect(product.profit).toBe(0);
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count', () => {
      const product = Product.create(validProps);
      expect(product.viewCount).toBe(0);

      product.incrementViewCount();
      expect(product.viewCount).toBe(1);

      product.incrementViewCount();
      expect(product.viewCount).toBe(2);
    });
  });

  describe('updateDetails extended', () => {
    it('should update all detail fields', () => {
      const product = Product.create(validProps);

      product.updateDetails({
        categoryId: 'new-cat',
        sku: 'NEW-SKU',
        slug: 'new-slug',
        shortDescription: 'New short desc',
        costPrice: 75,
        weight: 2.5,
        width: 15,
        height: 25,
        length: 35,
        imageUrl: 'https://new.com/img.jpg',
        galleryUrls: ['https://new.com/g1.jpg'],
        tags: ['new-tag'],
        attributes: { material: 'cotton' },
        metaTitle: 'New Meta',
        metaDescription: 'New Meta Desc',
      });

      expect(product.categoryId).toBe('new-cat');
      expect(product.sku).toBe('NEW-SKU');
      expect(product.slug).toBe('new-slug');
      expect(product.shortDescription).toBe('New short desc');
      expect(product.costPrice).toBe(75);
      expect(product.weight).toBe(2.5);
      expect(product.width).toBe(15);
      expect(product.height).toBe(25);
      expect(product.length).toBe(35);
      expect(product.imageUrl).toBe('https://new.com/img.jpg');
      expect(product.galleryUrls).toEqual(['https://new.com/g1.jpg']);
      expect(product.tags).toEqual(['new-tag']);
      expect(product.attributes).toEqual({ material: 'cotton' });
      expect(product.metaTitle).toBe('New Meta');
      expect(product.metaDescription).toBe('New Meta Desc');
    });
  });

  describe('toObject', () => {
    it('should convert product to object', () => {
      const product = Product.create(validProps);
      const obj = product.toObject();

      expect(obj.id).toBe(validProps.id);
      expect(obj.name).toBe(validProps.name);
      expect(obj.slug).toBe(validProps.slug);
      expect(obj.sku).toBe(validProps.sku);
      expect(obj.price).toBe(validProps.price);
      expect(obj.stockQuantity).toBe(0);
      expect(obj.isActive).toBe(true);
      expect(obj.isFeatured).toBe(false);
    });
  });

  describe('discountPercent edge cases', () => {
    it('should return 0 when compareAtPrice equals price', () => {
      const product = Product.create({ ...validProps, price: 100, compareAtPrice: 100 });
      expect(product.discountPercent).toBe(0);
    });

    it('should return 0 when compareAtPrice is less than price', () => {
      const product = Product.create({ ...validProps, price: 100, compareAtPrice: 80 });
      expect(product.discountPercent).toBe(0);
    });
  });
});
