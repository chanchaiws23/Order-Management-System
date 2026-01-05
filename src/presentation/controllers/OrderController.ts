import { Request, Response, NextFunction } from 'express';
import { CreateOrderUseCase } from '../../application/use-cases/CreateOrderUseCase';
import { CreateOrderDTO } from '../../application/dtos/CreateOrderDTO';
import {
  LogExecutionTime,
  ExecutionTimeDecorator,
} from '../decorators/LogExecutionTime';

export class OrderController {
  private readonly createOrderWithLogging: CreateOrderUseCase['execute'];

  constructor(private readonly createOrderUseCase: CreateOrderUseCase) {
    const decorator = new ExecutionTimeDecorator(this.createOrderUseCase);
    this.createOrderWithLogging = decorator.wrap('execute', 'CreateOrderUseCase.execute');
  }

  createOrder = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const dto: CreateOrderDTO = {
          customerId: req.body.customerId,
          customerEmail: req.body.customerEmail,
          customerName: req.body.customerName,
          items: req.body.items,
          currency: req.body.currency || 'USD',
          shippingAddress: req.body.shippingAddress,
          billingAddress: req.body.billingAddress,
          notes: req.body.notes,
          paymentMethod: req.body.paymentMethod || 'credit_card',
          paymentMetadata: req.body.paymentMetadata,
        };

        const result = await this.createOrderWithLogging(dto);

        if (result.success) {
          res.status(201).json({
            success: true,
            data: result.order,
            transactionId: result.paymentTransactionId,
          });
        } else {
          res.status(400).json({
            success: false,
            error: result.errorMessage,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({
          success: false,
          error: message,
        });
      }
    }
  );

  getHealth = LogExecutionTime()(
    async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    }
  );
}
