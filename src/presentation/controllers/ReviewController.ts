import { Request, Response, NextFunction } from 'express';
import { ReviewUseCases } from '../../application/use-cases/ReviewUseCases';
import { LogExecutionTime } from '../decorators/LogExecutionTime';

export class ReviewController {
  constructor(private readonly reviewUseCases: ReviewUseCases) {}

  createReview = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const review = await this.reviewUseCases.createReview(req.body);
        res.status(201).json({ success: true, data: review.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getReview = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const review = await this.reviewUseCases.getReviewById(req.params.id);
        if (!review) {
          res.status(404).json({ success: false, error: 'Review not found' });
          return;
        }
        res.json({ success: true, data: review.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getProductReviews = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await this.reviewUseCases.getProductReviews(req.params.productId, { page, limit });
        res.json({ success: true, ...result, data: result.data.map(r => r.toObject()) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getPendingReviews = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await this.reviewUseCases.getPendingReviews({ page, limit });
        res.json({ success: true, ...result, data: result.data.map(r => r.toObject()) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  approveReview = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const review = await this.reviewUseCases.approveReview(req.params.id);
        res.json({ success: true, data: review.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  rejectReview = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const review = await this.reviewUseCases.rejectReview(req.params.id);
        res.json({ success: true, data: review.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  updateReview = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const review = await this.reviewUseCases.updateReview(req.params.id, req.body);
        res.json({ success: true, data: review.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  deleteReview = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        await this.reviewUseCases.deleteReview(req.params.id);
        res.json({ success: true, message: 'Review deleted' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  markHelpful = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const review = await this.reviewUseCases.markHelpful(req.params.id);
        res.json({ success: true, data: review.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getProductRating = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const stats = await this.reviewUseCases.getProductRatingStats(req.params.productId);
        res.json({ success: true, data: stats });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );
}
