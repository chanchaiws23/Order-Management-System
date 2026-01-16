import { Request, Response, NextFunction } from 'express';
import { CreateOrderUseCase } from '../../application/use-cases/CreateOrderUseCase';
import { OrderQueryUseCases } from '../../application/use-cases/OrderQueryUseCases';
import { CreateOrderDTO } from '../../application/dtos/CreateOrderDTO';
import {
  LogExecutionTime,
  ExecutionTimeDecorator,
} from '../decorators/LogExecutionTime';

export class OrderController {
  private readonly createOrderWithLogging: CreateOrderUseCase['execute'];

  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly orderQueryUseCases: OrderQueryUseCases
  ) {
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

  getRecentOrders = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const limit = parseInt(req.query.limit as string) || 5;
        const orders = await this.orderQueryUseCases.getRecentOrders(limit);

        res.json({
          success: true,
          data: orders,
          count: orders.length,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get recent orders';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getOrderStats = LogExecutionTime()(
    async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const stats = await this.orderQueryUseCases.getOrderStats();

        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get order stats';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getOrderById = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { id } = req.params;
        const order = await this.orderQueryUseCases.getOrderById(id);

        if (!order) {
          res.status(404).json({ success: false, error: 'Order not found' });
          return;
        }

        res.json({
          success: true,
          data: order,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get order';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getCustomerOrders = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { customerId } = req.params;
        const orders = await this.orderQueryUseCases.getOrdersByCustomer(customerId);

        res.json({
          success: true,
          data: orders,
          count: orders.length,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get customer orders';
        res.status(500).json({ success: false, error: message });
      }
    }
  );
}
