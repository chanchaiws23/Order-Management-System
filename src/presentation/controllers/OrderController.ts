import { Request, Response, NextFunction } from 'express';
import { CreateOrderUseCase } from '../../application/use-cases/CreateOrderUseCase';
import { OrderQueryUseCases } from '../../application/use-cases/OrderQueryUseCases';
import { OrderManagementUseCases } from '../../application/use-cases/OrderManagementUseCases';
import { CreateOrderDTO } from '../../application/dtos/CreateOrderDTO';
import { OrderStatus } from '../../domain/value-objects/OrderStatus';
import {
  LogExecutionTime,
  ExecutionTimeDecorator,
} from '../decorators/LogExecutionTime';

export class OrderController {
  private readonly createOrderWithLogging: CreateOrderUseCase['execute'];

  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly orderQueryUseCases: OrderQueryUseCases,
    private readonly orderManagementUseCases: OrderManagementUseCases
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

  getAllOrders = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await this.orderManagementUseCases.getAllOrders({ page, limit });

        res.json({
          success: true,
          data: result.data.map(order => ({
            id: order.id,
            customerId: order.customerId,
            status: order.status,
            totalAmount: order.calculateTotal().amount,
            currency: order.currency,
            itemCount: order.calculateItemCount(),
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
          })),
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get orders';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  updateOrderStatus = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !Object.values(OrderStatus).includes(status)) {
          res.status(400).json({ success: false, error: 'Invalid status' });
          return;
        }

        const order = await this.orderManagementUseCases.updateOrderStatus(id, status);

        res.json({
          success: true,
          data: {
            id: order.id,
            status: order.status,
            updatedAt: order.updatedAt.toISOString(),
          },
          message: 'Order status updated successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update order status';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  cancelOrder = LogExecutionTime()(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { id } = req.params;
        const { reason } = req.body;

        const order = await this.orderManagementUseCases.cancelOrder(id, reason);

        res.json({
          success: true,
          data: {
            id: order.id,
            status: order.status,
            updatedAt: order.updatedAt.toISOString(),
          },
          message: 'Order cancelled successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to cancel order';
        res.status(400).json({ success: false, error: message });
      }
    }
  );
}
