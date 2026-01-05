import { Review } from '../../domain/entities/Review';
import { IReviewRepository } from '../../domain/repositories/IReviewRepository';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';
import { IdGenerator } from './CreateOrderUseCase';

export interface CreateReviewDTO {
  productId: string;
  customerId?: string;
  orderId?: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
}

export class ReviewUseCases {
  constructor(
    private readonly reviewRepo: IReviewRepository,
    private readonly productRepo: IProductRepository,
    private readonly orderRepo: IOrderRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async createReview(dto: CreateReviewDTO): Promise<Review> {
    const product = await this.productRepo.findById(dto.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    let isVerifiedPurchase = false;
    if (dto.orderId && dto.customerId) {
      const order = await this.orderRepo.findById(dto.orderId);
      if (order && order.customerId === dto.customerId) {
        const hasProduct = order.items.some(item => item.productId === dto.productId);
        isVerifiedPurchase = hasProduct;
      }
    }

    const review = Review.create({
      id: this.idGenerator.generate(),
      ...dto,
      isVerifiedPurchase,
    });

    await this.reviewRepo.save(review);
    return review;
  }

  async getReviewById(id: string): Promise<Review | null> {
    return this.reviewRepo.findById(id);
  }

  async getProductReviews(productId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Review>> {
    return this.reviewRepo.findApproved(productId, pagination);
  }

  async getAllProductReviews(productId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Review>> {
    return this.reviewRepo.findByProductId(productId, pagination);
  }

  async getCustomerReviews(customerId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Review>> {
    return this.reviewRepo.findByCustomerId(customerId, pagination);
  }

  async getPendingReviews(pagination?: PaginationOptions): Promise<PaginatedResult<Review>> {
    return this.reviewRepo.findPendingApproval(pagination);
  }

  async approveReview(id: string): Promise<Review> {
    const review = await this.reviewRepo.findById(id);
    if (!review) {
      throw new Error('Review not found');
    }

    review.approve();
    await this.reviewRepo.save(review);

    const product = await this.productRepo.findById(review.productId);
    if (product) {
      product.updateRating(review.rating);
      await this.productRepo.save(product);
    }

    return review;
  }

  async rejectReview(id: string): Promise<Review> {
    const review = await this.reviewRepo.findById(id);
    if (!review) {
      throw new Error('Review not found');
    }

    review.reject();
    await this.reviewRepo.save(review);
    return review;
  }

  async updateReview(id: string, dto: { rating?: number; title?: string; content?: string; images?: string[] }): Promise<Review> {
    const review = await this.reviewRepo.findById(id);
    if (!review) {
      throw new Error('Review not found');
    }

    review.update(dto);
    await this.reviewRepo.save(review);
    return review;
  }

  async deleteReview(id: string): Promise<void> {
    await this.reviewRepo.delete(id);
  }

  async markHelpful(id: string): Promise<Review> {
    const review = await this.reviewRepo.findById(id);
    if (!review) {
      throw new Error('Review not found');
    }

    review.incrementHelpful();
    await this.reviewRepo.save(review);
    return review;
  }

  async getProductRatingStats(productId: string): Promise<{ average: number; count: number }> {
    const average = await this.reviewRepo.getAverageRating(productId);
    const count = await this.reviewRepo.countByProductId(productId);
    return { average, count };
  }
}
