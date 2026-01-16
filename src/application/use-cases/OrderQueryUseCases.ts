import { Order } from '../../domain/entities/Order';
import { IOrderRepository, PaginationOptions } from '../../domain/repositories/IOrderRepository';
import { OrderStatus } from '../../domain/value-objects/OrderStatus';
import { OrderResponseDTO } from '../dtos/CreateOrderDTO';

export interface OrderStatsDTO {
  total: number;
  byStatus: Record<OrderStatus, number>;
  totalRevenue: number;
  averageOrderValue: number;
  recentOrdersCount: number;
}

export class OrderQueryUseCases {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async getRecentOrders(limit: number = 5): Promise<OrderResponseDTO[]> {
    const result = await this.orderRepository.findAll({ page: 1, limit });
    return result.data.map(order => this.mapToResponseDTO(order));
  }

  async getOrderStats(): Promise<OrderStatsDTO> {
    const total = await this.orderRepository.count();
    
    const byStatus: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: await this.orderRepository.countByStatus(OrderStatus.PENDING),
      [OrderStatus.CONFIRMED]: await this.orderRepository.countByStatus(OrderStatus.CONFIRMED),
      [OrderStatus.PROCESSING]: await this.orderRepository.countByStatus(OrderStatus.PROCESSING),
      [OrderStatus.SHIPPED]: await this.orderRepository.countByStatus(OrderStatus.SHIPPED),
      [OrderStatus.DELIVERED]: await this.orderRepository.countByStatus(OrderStatus.DELIVERED),
      [OrderStatus.CANCELLED]: await this.orderRepository.countByStatus(OrderStatus.CANCELLED),
      [OrderStatus.REFUNDED]: await this.orderRepository.countByStatus(OrderStatus.REFUNDED),
    };

    // Get all orders to calculate revenue
    const allOrders = await this.orderRepository.findAll({ page: 1, limit: 10000 });
    const totalRevenue = allOrders.data.reduce((sum, order) => {
      const total = order.calculateTotal();
      return sum + total.amount;
    }, 0);

    const averageOrderValue = total > 0 ? totalRevenue / total : 0;

    // Get recent orders count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrders = await this.orderRepository.search(
      { fromDate: sevenDaysAgo },
      { page: 1, limit: 10000 }
    );

    return {
      total,
      byStatus,
      totalRevenue,
      averageOrderValue,
      recentOrdersCount: recentOrders.total,
    };
  }

  async getOrderById(id: string): Promise<OrderResponseDTO | null> {
    const order = await this.orderRepository.findById(id);
    if (!order) return null;
    return this.mapToResponseDTO(order);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderResponseDTO[]> {
    const orders = await this.orderRepository.findByCustomerId(customerId);
    return orders.map(order => this.mapToResponseDTO(order));
  }

  private mapToResponseDTO(order: Order): OrderResponseDTO {
    const total = order.calculateTotal();

    return {
      id: order.id,
      customerId: order.customerId,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice.amount,
        quantity: item.quantity,
        subtotal: item.calculateSubtotal().amount,
      })),
      status: order.status,
      currency: order.currency,
      totalAmount: total.amount,
      itemCount: order.calculateItemCount(),
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
