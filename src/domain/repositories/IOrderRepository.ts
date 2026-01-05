import { Order } from '../entities/Order';
import { OrderStatus } from '../value-objects/OrderStatus';

export interface OrderSearchCriteria {
  customerId?: string;
  status?: OrderStatus;
  fromDate?: Date;
  toDate?: Date;
  minTotal?: number;
  maxTotal?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IOrderRepository {
  save(order: Order): Promise<void>;

  findById(id: string): Promise<Order | null>;

  findByCustomerId(customerId: string): Promise<Order[]>;

  findByStatus(status: OrderStatus): Promise<Order[]>;

  findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Order>>;

  search(
    criteria: OrderSearchCriteria,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Order>>;

  delete(id: string): Promise<void>;

  exists(id: string): Promise<boolean>;

  count(): Promise<number>;

  countByStatus(status: OrderStatus): Promise<number>;
}
