import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { OrderStatus } from '../../domain/value-objects/OrderStatus';

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  revenueChange: number;
  ordersChange: number;
  productsChange: number;
  customersChange: number;
  recentOrders: Array<{
    id: string;
    customerId: string;
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
  ordersByStatus: Record<OrderStatus, number>;
  lowStockProducts: number;
}

export class AdminDashboardUseCases {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
    private readonly customerRepo: ICustomerRepository
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    // Get current period data
    const totalOrders = await this.orderRepo.count();
    const totalProducts = await this.productRepo.count();
    const totalCustomers = await this.customerRepo.count();

    // Calculate total revenue
    const allOrders = await this.orderRepo.findAll({ page: 1, limit: 10000 });
    const totalRevenue = allOrders.data.reduce((sum, order) => {
      const total = order.calculateTotal();
      return sum + total.amount;
    }, 0);

    // Get orders by status
    const ordersByStatus: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: await this.orderRepo.countByStatus(OrderStatus.PENDING),
      [OrderStatus.CONFIRMED]: await this.orderRepo.countByStatus(OrderStatus.CONFIRMED),
      [OrderStatus.PROCESSING]: await this.orderRepo.countByStatus(OrderStatus.PROCESSING),
      [OrderStatus.SHIPPED]: await this.orderRepo.countByStatus(OrderStatus.SHIPPED),
      [OrderStatus.DELIVERED]: await this.orderRepo.countByStatus(OrderStatus.DELIVERED),
      [OrderStatus.CANCELLED]: await this.orderRepo.countByStatus(OrderStatus.CANCELLED),
      [OrderStatus.REFUNDED]: await this.orderRepo.countByStatus(OrderStatus.REFUNDED),
    };

    // Get recent orders (last 5)
    const recentOrdersResult = await this.orderRepo.findAll({ page: 1, limit: 5 });
    const recentOrders = recentOrdersResult.data.map(order => ({
      id: order.id,
      customerId: order.customerId,
      status: order.status,
      totalAmount: order.calculateTotal().amount,
      createdAt: order.createdAt.toISOString(),
    }));

    // Calculate changes (mock data for now - should compare with previous period)
    const revenueChange = 12.5; // % change
    const ordersChange = 8.3;
    const productsChange = 5.2;
    const customersChange = 15.7;

    // Get low stock products count
    const allProducts = await this.productRepo.findAll({ page: 1, limit: 10000 });
    const lowStockProducts = allProducts.data.filter(p => p.isLowStock).length;

    return {
      totalRevenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      revenueChange,
      ordersChange,
      productsChange,
      customersChange,
      recentOrders,
      ordersByStatus,
      lowStockProducts,
    };
  }
}
