import { Order } from '../../domain/entities/Order';
import { OrderItemProps } from '../../domain/entities/OrderItem';
import { Money } from '../../domain/value-objects/Money';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { INotificationService } from '../interfaces/INotificationService';
import { IEventPublisher } from '../interfaces/IEventPublisher';
import { PaymentFactory, PaymentMethodType } from '../factories/PaymentFactory';
import {
  CreateOrderDTO,
  CreateOrderResultDTO,
  OrderResponseDTO,
} from '../dtos/CreateOrderDTO';

export interface IdGenerator {
  generate(): string;
}

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly paymentFactory: PaymentFactory,
    private readonly notificationService: INotificationService,
    private readonly eventPublisher: IEventPublisher,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(dto: CreateOrderDTO): Promise<CreateOrderResultDTO> {
    try {
      console.log(`[CreateOrderUseCase] Starting order creation for customer: ${dto.customerId}`);

      this.validateInput(dto);

      const orderItems = this.mapToOrderItems(dto);
      const order = Order.create({
        id: this.idGenerator.generate(),
        customerId: dto.customerId,
        items: orderItems,
        currency: dto.currency,
        shippingAddress: dto.shippingAddress,
        billingAddress: dto.billingAddress,
        notes: dto.notes,
        eventIdGenerator: () => this.idGenerator.generate(),
      });

      console.log(`[CreateOrderUseCase] Order entity created: ${order.id}`);

      const total = order.calculateTotal();
      console.log(`[CreateOrderUseCase] Order total: ${total.toString()}`);

      const paymentStrategy = this.paymentFactory.createPaymentStrategy(
        dto.paymentMethod as PaymentMethodType
      );

      const paymentResult = await paymentStrategy.processPayment({
        orderId: order.id,
        amount: total.amount,
        currency: total.currency,
        customerId: dto.customerId,
        metadata: dto.paymentMetadata,
      });

      if (!paymentResult.success) {
        console.error(`[CreateOrderUseCase] Payment failed: ${paymentResult.errorMessage}`);
        return {
          success: false,
          errorMessage: `Payment failed: ${paymentResult.errorMessage}`,
        };
      }

      console.log(`[CreateOrderUseCase] Payment successful: ${paymentResult.transactionId}`);

      order.confirm();

      await this.orderRepository.save(order);
      console.log(`[CreateOrderUseCase] Order saved to repository`);

      const domainEvents = order.domainEvents;
      if (domainEvents.length > 0) {
        await this.eventPublisher.publishAll([...domainEvents]);
        order.clearDomainEvents();
        console.log(`[CreateOrderUseCase] Published ${domainEvents.length} domain event(s)`);
      }

      await this.sendOrderConfirmationEmail(dto, order, paymentResult.transactionId!);

      const responseDTO = this.mapToResponseDTO(order, paymentResult.transactionId!);

      console.log(`[CreateOrderUseCase] Order creation completed successfully`);

      return {
        success: true,
        order: responseDTO,
        paymentTransactionId: paymentResult.transactionId!,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CreateOrderUseCase] Error: ${errorMessage}`);

      return {
        success: false,
        errorMessage,
      };
    }
  }

  private validateInput(dto: CreateOrderDTO): void {
    if (!dto.customerId || dto.customerId.trim() === '') {
      throw new Error('Customer ID is required');
    }
    if (!dto.customerEmail || dto.customerEmail.trim() === '') {
      throw new Error('Customer email is required');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new Error('Order must have at least one item');
    }
    if (!dto.currency || dto.currency.length !== 3) {
      throw new Error('Valid currency code is required');
    }
    if (!this.paymentFactory.isMethodSupported(dto.paymentMethod)) {
      throw new Error(`Unsupported payment method: ${dto.paymentMethod}`);
    }

    for (const item of dto.items) {
      if (!item.productId || item.productId.trim() === '') {
        throw new Error('Product ID is required for all items');
      }
      if (item.quantity <= 0) {
        throw new Error('Item quantity must be greater than zero');
      }
      if (item.unitPrice < 0) {
        throw new Error('Item price cannot be negative');
      }
    }
  }

  private mapToOrderItems(dto: CreateOrderDTO): OrderItemProps[] {
    return dto.items.map((item) => ({
      id: this.idGenerator.generate(),
      productId: item.productId,
      productName: item.productName,
      unitPrice: Money.create(item.unitPrice, dto.currency),
      quantity: item.quantity,
    }));
  }

  private async sendOrderConfirmationEmail(
    dto: CreateOrderDTO,
    order: Order,
    transactionId: string
  ): Promise<void> {
    try {
      const total = order.calculateTotal();

      await this.notificationService.send({
        recipient: {
          id: dto.customerId,
          email: dto.customerEmail,
          name: dto.customerName,
        },
        subject: `Order Confirmation - ${order.id}`,
        body: this.buildEmailBody(order, transactionId),
        templateId: 'order-confirmation',
        templateData: {
          orderId: order.id,
          customerName: dto.customerName,
          totalAmount: total.amount,
          currency: total.currency,
          itemCount: order.calculateItemCount(),
          transactionId,
        },
      });

      console.log(`[CreateOrderUseCase] Confirmation email sent to ${dto.customerEmail}`);
    } catch (error) {
      console.error(
        `[CreateOrderUseCase] Failed to send confirmation email: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private buildEmailBody(order: Order, transactionId: string): string {
    const total = order.calculateTotal();
    const items = order.items
      .map(
        (item) =>
          `- ${item.productName} x${item.quantity}: ${item.calculateSubtotal().toString()}`
      )
      .join('\n');

    return `
Thank you for your order!

Order ID: ${order.id}
Transaction ID: ${transactionId}

Items:
${items}

Total: ${total.toString()}

Your order has been confirmed and is being processed.
    `.trim();
  }

  private mapToResponseDTO(order: Order, transactionId: string): OrderResponseDTO {
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
      paymentTransactionId: transactionId,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
