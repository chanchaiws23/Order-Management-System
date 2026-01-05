export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';

export interface CouponProps {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  usageLimitPerCustomer: number;
  isActive: boolean;
  startsAt?: Date;
  expiresAt?: Date;
  applicableProducts?: string[];
  applicableCategories?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCouponProps {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  usageLimitPerCustomer?: number;
  startsAt?: Date;
  expiresAt?: Date;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

export class Coupon {
  private readonly _id: string;
  private _code: string;
  private _name: string;
  private _description?: string;
  private _discountType: DiscountType;
  private _discountValue: number;
  private _minimumOrderAmount: number;
  private _maximumDiscount?: number;
  private _usageLimit?: number;
  private _usageCount: number;
  private _usageLimitPerCustomer: number;
  private _isActive: boolean;
  private _startsAt?: Date;
  private _expiresAt?: Date;
  private _applicableProducts?: string[];
  private _applicableCategories?: string[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: CouponProps) {
    this._id = props.id;
    this._code = props.code;
    this._name = props.name;
    this._description = props.description;
    this._discountType = props.discountType;
    this._discountValue = props.discountValue;
    this._minimumOrderAmount = props.minimumOrderAmount;
    this._maximumDiscount = props.maximumDiscount;
    this._usageLimit = props.usageLimit;
    this._usageCount = props.usageCount;
    this._usageLimitPerCustomer = props.usageLimitPerCustomer;
    this._isActive = props.isActive;
    this._startsAt = props.startsAt;
    this._expiresAt = props.expiresAt;
    this._applicableProducts = props.applicableProducts;
    this._applicableCategories = props.applicableCategories;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: CreateCouponProps): Coupon {
    if (!props.code || props.code.trim() === '') {
      throw new Error('Coupon code is required');
    }
    if (props.discountValue <= 0) {
      throw new Error('Discount value must be positive');
    }
    if (props.discountType === 'PERCENTAGE' && props.discountValue > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    const now = new Date();
    return new Coupon({
      ...props,
      code: props.code.toUpperCase(),
      minimumOrderAmount: props.minimumOrderAmount ?? 0,
      usageCount: 0,
      usageLimitPerCustomer: props.usageLimitPerCustomer ?? 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: CouponProps): Coupon {
    return new Coupon(props);
  }

  get id(): string { return this._id; }
  get code(): string { return this._code; }
  get name(): string { return this._name; }
  get description(): string | undefined { return this._description; }
  get discountType(): DiscountType { return this._discountType; }
  get discountValue(): number { return this._discountValue; }
  get minimumOrderAmount(): number { return this._minimumOrderAmount; }
  get maximumDiscount(): number | undefined { return this._maximumDiscount; }
  get usageLimit(): number | undefined { return this._usageLimit; }
  get usageCount(): number { return this._usageCount; }
  get usageLimitPerCustomer(): number { return this._usageLimitPerCustomer; }
  get isActive(): boolean { return this._isActive; }
  get startsAt(): Date | undefined { return this._startsAt; }
  get expiresAt(): Date | undefined { return this._expiresAt; }
  get applicableProducts(): string[] | undefined { return this._applicableProducts; }
  get applicableCategories(): string[] | undefined { return this._applicableCategories; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  get isExpired(): boolean {
    if (!this._expiresAt) return false;
    return new Date() > this._expiresAt;
  }

  get hasStarted(): boolean {
    if (!this._startsAt) return true;
    return new Date() >= this._startsAt;
  }

  get isUsable(): boolean {
    if (!this._isActive) return false;
    if (this.isExpired) return false;
    if (!this.hasStarted) return false;
    if (this._usageLimit && this._usageCount >= this._usageLimit) return false;
    return true;
  }

  get remainingUsage(): number | undefined {
    if (!this._usageLimit) return undefined;
    return Math.max(0, this._usageLimit - this._usageCount);
  }

  calculateDiscount(orderAmount: number): number {
    if (orderAmount < this._minimumOrderAmount) return 0;

    let discount = 0;
    switch (this._discountType) {
      case 'PERCENTAGE':
        discount = (orderAmount * this._discountValue) / 100;
        break;
      case 'FIXED_AMOUNT':
        discount = this._discountValue;
        break;
      case 'FREE_SHIPPING':
        return 0;
    }

    if (this._maximumDiscount) {
      discount = Math.min(discount, this._maximumDiscount);
    }

    return Math.min(discount, orderAmount);
  }

  isApplicableToProduct(productId: string): boolean {
    if (!this._applicableProducts || this._applicableProducts.length === 0) return true;
    return this._applicableProducts.includes(productId);
  }

  isApplicableToCategory(categoryId: string): boolean {
    if (!this._applicableCategories || this._applicableCategories.length === 0) return true;
    return this._applicableCategories.includes(categoryId);
  }

  incrementUsage(): void {
    this._usageCount++;
    this.touch();
  }

  update(data: Partial<Omit<CreateCouponProps, 'id' | 'code'>>): void {
    if (data.name !== undefined) this._name = data.name;
    if (data.description !== undefined) this._description = data.description;
    if (data.discountType !== undefined) this._discountType = data.discountType;
    if (data.discountValue !== undefined) this._discountValue = data.discountValue;
    if (data.minimumOrderAmount !== undefined) this._minimumOrderAmount = data.minimumOrderAmount;
    if (data.maximumDiscount !== undefined) this._maximumDiscount = data.maximumDiscount;
    if (data.usageLimit !== undefined) this._usageLimit = data.usageLimit;
    if (data.usageLimitPerCustomer !== undefined) this._usageLimitPerCustomer = data.usageLimitPerCustomer;
    if (data.startsAt !== undefined) this._startsAt = data.startsAt;
    if (data.expiresAt !== undefined) this._expiresAt = data.expiresAt;
    if (data.applicableProducts !== undefined) this._applicableProducts = data.applicableProducts;
    if (data.applicableCategories !== undefined) this._applicableCategories = data.applicableCategories;
    this.touch();
  }

  activate(): void { this._isActive = true; this.touch(); }
  deactivate(): void { this._isActive = false; this.touch(); }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toObject(): CouponProps {
    return {
      id: this._id,
      code: this._code,
      name: this._name,
      description: this._description,
      discountType: this._discountType,
      discountValue: this._discountValue,
      minimumOrderAmount: this._minimumOrderAmount,
      maximumDiscount: this._maximumDiscount,
      usageLimit: this._usageLimit,
      usageCount: this._usageCount,
      usageLimitPerCustomer: this._usageLimitPerCustomer,
      isActive: this._isActive,
      startsAt: this._startsAt,
      expiresAt: this._expiresAt,
      applicableProducts: this._applicableProducts,
      applicableCategories: this._applicableCategories,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
