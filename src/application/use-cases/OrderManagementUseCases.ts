import { Order } from '../../domain/entities/Order';
import { OrderStatus } from '../../domain/value-objects/OrderStatus';
import { IOrderRepository, PaginationOptions, PaginatedResult, OrderSearchCriteria } from '../../domain/repositories/IOrderRepository';

export class OrderManagementUseCases {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async getAllOrders(pagination?: PaginationOptions): Promise<PaginatedResult<Order>> {
    return this.orderRepository.findAll(pagination);
  }

  async searchOrders(criteria: OrderSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<Order>> {
    return this.orderRepository.search(criteria, pagination);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Validate status transition
    this.validateStatusTransition(order.status, status);

    // Update status based on new status
    switch (status) {
      case OrderStatus.CONFIRMED:
        order.confirm();
        break;
      case OrderStatus.PROCESSING:
        order.process();
        break;
      case OrderStatus.SHIPPED:
        order.ship();
        break;
      case OrderStatus.DELIVERED:
        order.deliver();
        break;
      case OrderStatus.CANCELLED:
        order.cancel();
        break;
      case OrderStatus.REFUNDED:
        order.refund();
        break;
      default:
        throw new Error(`Invalid status: ${status}`);
    }

    await this.orderRepository.save(order);
    return order;
  }

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === OrderStatus.DELIVERED) {
      throw new Error('Cannot cancel delivered order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new Error('Order is already cancelled');
    }

    order.cancel();
    await this.orderRepository.save(order);
    return order;
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }
}
