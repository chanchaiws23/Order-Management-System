import { Coupon } from '../../../src/domain/entities/Coupon';

describe('Coupon Entity', () => {
  const validProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    code: 'SAVE20',
    name: 'Save 20%',
    discountType: 'PERCENTAGE' as const,
    discountValue: 20,
    minimumOrderAmount: 100,
    startsAt: new Date('2024-01-01'),
    expiresAt: new Date('2025-12-31'),
  };

  describe('create', () => {
    it('should create coupon with valid props', () => {
      const coupon = Coupon.create(validProps);

      expect(coupon.id).toBe(validProps.id);
      expect(coupon.code).toBe('SAVE20');
      expect(coupon.discountType).toBe('PERCENTAGE');
      expect(coupon.discountValue).toBe(20);
      expect(coupon.isActive).toBe(true);
      expect(coupon.usageCount).toBe(0);
    });

    it('should throw error for empty code', () => {
      expect(() => Coupon.create({ ...validProps, code: '' }))
        .toThrow('Coupon code is required');
    });

    it('should throw error for zero discount value', () => {
      expect(() => Coupon.create({ ...validProps, discountValue: 0 }))
        .toThrow('Discount value must be positive');
    });

    it('should throw error for percentage over 100', () => {
      expect(() => Coupon.create({ ...validProps, discountType: 'PERCENTAGE', discountValue: 150 }))
        .toThrow('Percentage discount cannot exceed 100%');
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate percentage discount', () => {
      const coupon = Coupon.create(validProps);

      const discount = coupon.calculateDiscount(200);
      expect(discount).toBe(40); // 20% of 200
    });

    it('should calculate fixed amount discount', () => {
      const coupon = Coupon.create({
        ...validProps,
        discountType: 'FIXED_AMOUNT',
        discountValue: 50,
      });

      const discount = coupon.calculateDiscount(200);
      expect(discount).toBe(50);
    });

    it('should not exceed order amount for fixed discount', () => {
      const coupon = Coupon.create({
        ...validProps,
        discountType: 'FIXED_AMOUNT',
        discountValue: 100,
        minimumOrderAmount: 0,
      });

      const discount = coupon.calculateDiscount(50);
      expect(discount).toBe(50);
    });

    it('should return 0 if minimum order amount not met', () => {
      const coupon = Coupon.create({
        ...validProps,
        minimumOrderAmount: 200,
      });

      const discount = coupon.calculateDiscount(100);
      expect(discount).toBe(0);
    });
  });

  describe('isUsable', () => {
    it('should return true for usable coupon', () => {
      const coupon = Coupon.create({
        ...validProps,
        startsAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() + 86400000),
      });

      expect(coupon.isUsable).toBe(true);
    });

    it('should return false for inactive coupon', () => {
      const coupon = Coupon.create({
        ...validProps,
        startsAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() + 86400000),
      });
      coupon.deactivate();

      expect(coupon.isUsable).toBe(false);
    });

    it('should return false for expired coupon', () => {
      const coupon = Coupon.create({
        ...validProps,
        startsAt: new Date('2020-01-01'),
        expiresAt: new Date('2020-12-31'),
      });

      expect(coupon.isExpired).toBe(true);
      expect(coupon.isUsable).toBe(false);
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage count', () => {
      const coupon = Coupon.create(validProps);

      coupon.incrementUsage();
      expect(coupon.usageCount).toBe(1);

      coupon.incrementUsage();
      expect(coupon.usageCount).toBe(2);
    });
  });

  describe('activate/deactivate', () => {
    it('should deactivate coupon', () => {
      const coupon = Coupon.create(validProps);

      coupon.deactivate();
      expect(coupon.isActive).toBe(false);
    });

    it('should activate coupon', () => {
      const coupon = Coupon.create(validProps);
      coupon.deactivate();

      coupon.activate();
      expect(coupon.isActive).toBe(true);
    });
  });

  describe('isApplicableToProduct', () => {
    it('should return true when no restrictions', () => {
      const coupon = Coupon.create(validProps);
      expect(coupon.isApplicableToProduct('any-product')).toBe(true);
    });

    it('should return true for applicable product', () => {
      const coupon = Coupon.create({
        ...validProps,
        applicableProducts: ['product-1', 'product-2'],
      });
      expect(coupon.isApplicableToProduct('product-1')).toBe(true);
    });

    it('should return false for non-applicable product', () => {
      const coupon = Coupon.create({
        ...validProps,
        applicableProducts: ['product-1', 'product-2'],
      });
      expect(coupon.isApplicableToProduct('product-3')).toBe(false);
    });
  });

  describe('isApplicableToCategory', () => {
    it('should return true when no restrictions', () => {
      const coupon = Coupon.create(validProps);
      expect(coupon.isApplicableToCategory('any-category')).toBe(true);
    });

    it('should return true for applicable category', () => {
      const coupon = Coupon.create({
        ...validProps,
        applicableCategories: ['cat-1', 'cat-2'],
      });
      expect(coupon.isApplicableToCategory('cat-1')).toBe(true);
    });

    it('should return false for non-applicable category', () => {
      const coupon = Coupon.create({
        ...validProps,
        applicableCategories: ['cat-1', 'cat-2'],
      });
      expect(coupon.isApplicableToCategory('cat-3')).toBe(false);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute coupon from props', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');
      const coupon = Coupon.reconstitute({
        ...validProps,
        usageCount: 5,
        usageLimitPerCustomer: 2,
        isActive: false,
        createdAt,
        updatedAt,
      });

      expect(coupon.usageCount).toBe(5);
      expect(coupon.usageLimitPerCustomer).toBe(2);
      expect(coupon.isActive).toBe(false);
      expect(coupon.createdAt).toBe(createdAt);
    });
  });

  describe('update', () => {
    it('should update coupon fields', () => {
      const coupon = Coupon.create(validProps);

      coupon.update({
        name: 'Updated Name',
        description: 'New description',
        discountValue: 30,
        minimumOrderAmount: 200,
        maximumDiscount: 100,
        usageLimit: 50,
        usageLimitPerCustomer: 3,
      });

      expect(coupon.name).toBe('Updated Name');
      expect(coupon.description).toBe('New description');
      expect(coupon.discountValue).toBe(30);
      expect(coupon.minimumOrderAmount).toBe(200);
      expect(coupon.maximumDiscount).toBe(100);
      expect(coupon.usageLimit).toBe(50);
      expect(coupon.usageLimitPerCustomer).toBe(3);
    });

    it('should update discount type', () => {
      const coupon = Coupon.create(validProps);
      coupon.update({ discountType: 'FIXED_AMOUNT' });
      expect(coupon.discountType).toBe('FIXED_AMOUNT');
    });

    it('should update dates and applicable items', () => {
      const coupon = Coupon.create(validProps);
      const newStart = new Date('2025-01-01');
      const newExpiry = new Date('2025-12-31');

      coupon.update({
        startsAt: newStart,
        expiresAt: newExpiry,
        applicableProducts: ['p1', 'p2'],
        applicableCategories: ['c1'],
      });

      expect(coupon.startsAt).toBe(newStart);
      expect(coupon.expiresAt).toBe(newExpiry);
      expect(coupon.applicableProducts).toEqual(['p1', 'p2']);
      expect(coupon.applicableCategories).toEqual(['c1']);
    });
  });

  describe('hasStarted', () => {
    it('should return true when no start date', () => {
      const coupon = Coupon.create({
        ...validProps,
        startsAt: undefined,
      });
      expect(coupon.hasStarted).toBe(true);
    });

    it('should return true when start date passed', () => {
      const coupon = Coupon.create({
        ...validProps,
        startsAt: new Date(Date.now() - 86400000),
      });
      expect(coupon.hasStarted).toBe(true);
    });

    it('should return false when start date not reached', () => {
      const coupon = Coupon.create({
        ...validProps,
        startsAt: new Date(Date.now() + 86400000),
      });
      expect(coupon.hasStarted).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return false when no expiry date', () => {
      const coupon = Coupon.create({
        ...validProps,
        expiresAt: undefined,
      });
      expect(coupon.isExpired).toBe(false);
    });
  });

  describe('remainingUsage', () => {
    it('should return undefined when no usage limit', () => {
      const coupon = Coupon.create(validProps);
      expect(coupon.remainingUsage).toBeUndefined();
    });

    it('should return remaining usage count', () => {
      const coupon = Coupon.create({
        ...validProps,
        usageLimit: 10,
      });
      coupon.incrementUsage();
      coupon.incrementUsage();
      expect(coupon.remainingUsage).toBe(8);
    });
  });

  describe('isUsable with usage limit', () => {
    it('should return false when usage limit reached', () => {
      const coupon = Coupon.create({
        ...validProps,
        usageLimit: 2,
        startsAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() + 86400000),
      });
      coupon.incrementUsage();
      coupon.incrementUsage();
      expect(coupon.isUsable).toBe(false);
    });

    it('should return false when not started yet', () => {
      const coupon = Coupon.create({
        ...validProps,
        startsAt: new Date(Date.now() + 86400000),
        expiresAt: new Date(Date.now() + 172800000),
      });
      expect(coupon.isUsable).toBe(false);
    });
  });

  describe('calculateDiscount with maximum', () => {
    it('should cap discount at maximum', () => {
      const coupon = Coupon.create({
        ...validProps,
        discountType: 'PERCENTAGE',
        discountValue: 50,
        maximumDiscount: 30,
        minimumOrderAmount: 0,
      });
      const discount = coupon.calculateDiscount(200);
      expect(discount).toBe(30);
    });

    it('should return 0 for FREE_SHIPPING type', () => {
      const coupon = Coupon.create({
        ...validProps,
        discountType: 'FREE_SHIPPING',
        discountValue: 1,
        minimumOrderAmount: 0,
      });
      const discount = coupon.calculateDiscount(200);
      expect(discount).toBe(0);
    });
  });

  describe('toObject', () => {
    it('should return all properties', () => {
      const coupon = Coupon.create({
        ...validProps,
        description: 'Test desc',
        maximumDiscount: 50,
        usageLimit: 100,
      });
      const obj = coupon.toObject();

      expect(obj.id).toBe(validProps.id);
      expect(obj.code).toBe('SAVE20');
      expect(obj.name).toBe(validProps.name);
      expect(obj.description).toBe('Test desc');
      expect(obj.discountType).toBe('PERCENTAGE');
      expect(obj.discountValue).toBe(20);
      expect(obj.maximumDiscount).toBe(50);
      expect(obj.usageLimit).toBe(100);
      expect(obj.usageCount).toBe(0);
      expect(obj.isActive).toBe(true);
    });
  });

  describe('getters', () => {
    it('should return all properties correctly', () => {
      const coupon = Coupon.create({
        ...validProps,
        description: 'Desc',
        maximumDiscount: 50,
        usageLimit: 100,
        applicableProducts: ['p1'],
        applicableCategories: ['c1'],
      });

      expect(coupon.id).toBeDefined();
      expect(coupon.code).toBe('SAVE20');
      expect(coupon.name).toBe('Save 20%');
      expect(coupon.description).toBe('Desc');
      expect(coupon.discountType).toBe('PERCENTAGE');
      expect(coupon.discountValue).toBe(20);
      expect(coupon.minimumOrderAmount).toBe(100);
      expect(coupon.maximumDiscount).toBe(50);
      expect(coupon.usageLimit).toBe(100);
      expect(coupon.usageCount).toBe(0);
      expect(coupon.usageLimitPerCustomer).toBe(1);
      expect(coupon.isActive).toBe(true);
      expect(coupon.applicableProducts).toEqual(['p1']);
      expect(coupon.applicableCategories).toEqual(['c1']);
      expect(coupon.createdAt).toBeInstanceOf(Date);
      expect(coupon.updatedAt).toBeInstanceOf(Date);
    });
  });
});
