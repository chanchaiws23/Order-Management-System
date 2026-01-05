import { Coupon, DiscountType } from '../../domain/entities/Coupon';
import { ICouponRepository } from '../../domain/repositories/ICouponRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';
import { IdGenerator } from './CreateOrderUseCase';

export interface CreateCouponDTO {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  usageLimitPerCustomer?: number;
  startsAt?: string;
  expiresAt?: string;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

export class CouponUseCases {
  constructor(
    private readonly couponRepo: ICouponRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async createCoupon(dto: CreateCouponDTO): Promise<Coupon> {
    const exists = await this.couponRepo.existsByCode(dto.code);
    if (exists) {
      throw new Error('Coupon code already exists');
    }

    const coupon = Coupon.create({
      id: this.idGenerator.generate(),
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    await this.couponRepo.save(coupon);
    return coupon;
  }

  async getCouponById(id: string): Promise<Coupon | null> {
    return this.couponRepo.findById(id);
  }

  async getCouponByCode(code: string): Promise<Coupon | null> {
    return this.couponRepo.findByCode(code);
  }

  async validateCoupon(code: string, orderAmount: number): Promise<{ valid: boolean; discount: number; message?: string }> {
    const coupon = await this.couponRepo.findByCode(code);
    
    if (!coupon) {
      return { valid: false, discount: 0, message: 'Coupon not found' };
    }

    if (!coupon.isUsable) {
      if (!coupon.isActive) return { valid: false, discount: 0, message: 'Coupon is inactive' };
      if (coupon.isExpired) return { valid: false, discount: 0, message: 'Coupon has expired' };
      if (!coupon.hasStarted) return { valid: false, discount: 0, message: 'Coupon is not yet active' };
      return { valid: false, discount: 0, message: 'Coupon usage limit reached' };
    }

    if (orderAmount < coupon.minimumOrderAmount) {
      return { valid: false, discount: 0, message: `Minimum order amount is ${coupon.minimumOrderAmount}` };
    }

    const discount = coupon.calculateDiscount(orderAmount);
    return { valid: true, discount };
  }

  async applyCoupon(code: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findByCode(code);
    if (!coupon) {
      throw new Error('Coupon not found');
    }

    if (!coupon.isUsable) {
      throw new Error('Coupon is not usable');
    }

    coupon.incrementUsage();
    await this.couponRepo.save(coupon);
    return coupon;
  }

  async updateCoupon(id: string, dto: Partial<Omit<CreateCouponDTO, 'code'>>): Promise<Coupon> {
    const coupon = await this.couponRepo.findById(id);
    if (!coupon) {
      throw new Error('Coupon not found');
    }

    coupon.update({
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    await this.couponRepo.save(coupon);
    return coupon;
  }

  async deleteCoupon(id: string): Promise<void> {
    await this.couponRepo.delete(id);
  }

  async getActiveCoupons(pagination?: PaginationOptions): Promise<PaginatedResult<Coupon>> {
    return this.couponRepo.findActive(pagination);
  }

  async getAllCoupons(pagination?: PaginationOptions): Promise<PaginatedResult<Coupon>> {
    return this.couponRepo.findAll(pagination);
  }

  async toggleCouponStatus(id: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findById(id);
    if (!coupon) {
      throw new Error('Coupon not found');
    }

    if (coupon.isActive) {
      coupon.deactivate();
    } else {
      coupon.activate();
    }

    await this.couponRepo.save(coupon);
    return coupon;
  }
}
