import { Coupon } from '../entities/Coupon';
import { PaginationOptions, PaginatedResult } from './IOrderRepository';

export interface ICouponRepository {
  save(coupon: Coupon): Promise<void>;
  findById(id: string): Promise<Coupon | null>;
  findByCode(code: string): Promise<Coupon | null>;
  findActive(pagination?: PaginationOptions): Promise<PaginatedResult<Coupon>>;
  findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Coupon>>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  existsByCode(code: string): Promise<boolean>;
  count(): Promise<number>;
}
