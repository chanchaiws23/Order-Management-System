import { Payment, PaymentStatus } from '../entities/Payment';
import { PaginationOptions, PaginatedResult } from './IOrderRepository';

export interface IPaymentRepository {
  save(payment: Payment): Promise<void>;
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment[]>;
  findByTransactionId(transactionId: string): Promise<Payment | null>;
  findByStatus(status: PaymentStatus, pagination?: PaginationOptions): Promise<PaginatedResult<Payment>>;
  findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Payment>>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  sumByStatus(status: PaymentStatus): Promise<number>;
}
