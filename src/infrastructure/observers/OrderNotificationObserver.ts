import { DomainEvent } from '../../domain/events/DomainEvent';
import { OrderCreatedEvent } from '../../domain/events/OrderCreatedEvent';
import { IEventObserver } from '../../application/interfaces/IEventPublisher';

export class OrderNotificationObserver implements IEventObserver {
  readonly observerName = 'OrderNotificationObserver';

  private readonly supportedEvents = ['ORDER_CREATED', 'ORDER_STATUS_CHANGED'];

  async handleEvent(event: DomainEvent): Promise<void> {
    console.log(
      `[OrderNotificationObserver] Handling event: ${event.eventType}`
    );

    switch (event.eventType) {
      case 'ORDER_CREATED':
        await this.handleOrderCreated(event as OrderCreatedEvent);
        break;
      default:
        console.log(
          `[OrderNotificationObserver] No handler for event: ${event.eventType}`
        );
    }
  }

  supports(eventType: string): boolean {
    return this.supportedEvents.includes(eventType);
  }

  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    console.log(
      `[OrderNotificationObserver] Order created notification:`,
      `OrderId=${event.orderId}`,
      `CustomerId=${event.customerId}`,
      `Total=${event.currency} ${event.totalAmount}`,
      `Items=${event.itemCount}`
    );
  }
}
