import { Request, Response, NextFunction } from 'express';
import { PaymentUseCases } from '../../application/use-cases/PaymentUseCases';
import { LogExecutionTime } from '../decorators/LogExecutionTime';

export class PaymentController {
  constructor(private readonly paymentUseCases: PaymentUseCases) {}

  createPayment = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const payment = await this.paymentUseCases.createPayment(req.body);
        res.status(201).json({ success: true, data: payment.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getPayment = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const payment = await this.paymentUseCases.getPaymentById(req.params.id);
        if (!payment) {
          res.status(404).json({ success: false, error: 'Payment not found' });
          return;
        }
        res.json({ success: true, data: payment.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getOrderPayments = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const payments = await this.paymentUseCases.getPaymentsByOrderId(req.params.orderId);
        res.json({ success: true, data: payments.map(p => p.toObject()) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  markSuccess = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { transactionId, gatewayResponse } = req.body;
        const payment = await this.paymentUseCases.markPaymentSuccess(req.params.id, transactionId, gatewayResponse);
        res.json({ success: true, data: payment.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  markFailed = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { errorMessage, gatewayResponse } = req.body;
        const payment = await this.paymentUseCases.markPaymentFailed(req.params.id, errorMessage, gatewayResponse);
        res.json({ success: true, data: payment.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  refund = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { amount } = req.body;
        const payment = await this.paymentUseCases.refundPayment(req.params.id, amount);
        res.json({ success: true, data: payment.toObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getAllPayments = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await this.paymentUseCases.getAllPayments({ page, limit });
        res.json({ success: true, ...result, data: result.data.map(p => p.toObject()) });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getStats = LogExecutionTime()(
    async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const [revenue, refunded] = await Promise.all([
          this.paymentUseCases.getTotalRevenue(),
          this.paymentUseCases.getTotalRefunded(),
        ]);
        res.json({ success: true, data: { revenue, refunded, net: revenue - refunded } });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ success: false, error: message });
      }
    }
  );
}
