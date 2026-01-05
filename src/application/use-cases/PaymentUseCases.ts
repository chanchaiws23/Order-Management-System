import { Payment, PaymentStatus } from '../../domain/entities/Payment';
import { IPaymentRepository } from '../../domain/repositories/IPaymentRepository';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';
import { IdGenerator } from './CreateOrderUseCase';

export interface CreatePaymentDTO {
  orderId: string;
  paymentMethod: string;
  gateway: string;
  amount: number;
  currency?: string;
}

export class PaymentUseCases {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly orderRepo: IOrderRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async createPayment(dto: CreatePaymentDTO): Promise<Payment> {
    const order = await this.orderRepo.findById(dto.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const payment = Payment.create({
      id: this.idGenerator.generate(),
      ...dto,
    });

    await this.paymentRepo.save(payment);
    return payment;
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    return this.paymentRepo.findById(id);
  }

  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    return this.paymentRepo.findByOrderId(orderId);
  }

  async markPaymentSuccess(id: string, transactionId: string, gatewayResponse?: Record<string, unknown>): Promise<Payment> {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.markAsSuccess(transactionId, gatewayResponse);
    await this.paymentRepo.save(payment);
    return payment;
  }

  async markPaymentFailed(id: string, errorMessage: string, gatewayResponse?: Record<string, unknown>): Promise<Payment> {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.markAsFailed(errorMessage, gatewayResponse);
    await this.paymentRepo.save(payment);
    return payment;
  }

  async refundPayment(id: string, amount: number): Promise<Payment> {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.refund(amount);
    await this.paymentRepo.save(payment);
    return payment;
  }

  async getPaymentsByStatus(status: PaymentStatus, pagination?: PaginationOptions): Promise<PaginatedResult<Payment>> {
    return this.paymentRepo.findByStatus(status, pagination);
  }

  async getAllPayments(pagination?: PaginationOptions): Promise<PaginatedResult<Payment>> {
    return this.paymentRepo.findAll(pagination);
  }

  async getTotalRevenue(): Promise<number> {
    return this.paymentRepo.sumByStatus('SUCCESS');
  }

  async getTotalRefunded(): Promise<number> {
    return this.paymentRepo.sumByStatus('REFUNDED');
  }
}
