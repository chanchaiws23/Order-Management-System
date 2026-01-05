import { Review } from '../entities/Review';
import { PaginationOptions, PaginatedResult } from './IOrderRepository';

export interface IReviewRepository {
  save(review: Review): Promise<void>;
  findById(id: string): Promise<Review | null>;
  findByProductId(productId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Review>>;
  findByCustomerId(customerId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Review>>;
  findApproved(productId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Review>>;
  findPendingApproval(pagination?: PaginationOptions): Promise<PaginatedResult<Review>>;
  findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Review>>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  countByProductId(productId: string): Promise<number>;
  getAverageRating(productId: string): Promise<number>;
}
