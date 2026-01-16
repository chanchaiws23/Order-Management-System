import { Request, Response, NextFunction } from 'express';
import { CouponUseCases } from '../../application/use-cases/CouponUseCases';
import { LogExecutionTime } from '../decorators/LogExecutionTime';

export class CouponController {
  constructor(private readonly couponUseCases: CouponUseCases) {}

  createCoupon = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const coupon = await this.couponUseCases.createCoupon(req.body);
        res.status(201).json({ success: true, data: coupon.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getCoupon = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const coupon = await this.couponUseCases.getCouponById(req.params.id);
        if (!coupon) {
          res.status(404).json({ success: false, error: 'Coupon not found' });
          return;
        }
        res.json({ success: true, data: coupon.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getCouponByCode = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { code } = req.params;
        const coupon = await this.couponUseCases.getCouponByCode(code);
        if (!coupon) {
          res.status(404).json({ success: false, error: 'Coupon not found' });
          return;
        }
        res.json({ success: true, data: coupon.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  validateCoupon = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { code, orderAmount } = req.body;
        const result = await this.couponUseCases.validateCoupon(code, orderAmount);
        res.json({ success: true, data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  updateCoupon = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const coupon = await this.couponUseCases.updateCoupon(req.params.id, req.body);
        res.json({ success: true, data: coupon.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  deleteCoupon = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        await this.couponUseCases.deleteCoupon(req.params.id);
        res.json({ success: true, message: 'Coupon deleted' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getAllCoupons = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await this.couponUseCases.getAllCoupons({ page, limit });
        res.json({ success: true, ...result, data: result.data.map(c => c.toObject()) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getActiveCoupons = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await this.couponUseCases.getActiveCoupons({ page, limit });
        res.json({ success: true, ...result, data: result.data.map(c => c.toObject()) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  toggleStatus = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const coupon = await this.couponUseCases.toggleCouponStatus(req.params.id);
        res.json({ success: true, data: coupon.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );
}
