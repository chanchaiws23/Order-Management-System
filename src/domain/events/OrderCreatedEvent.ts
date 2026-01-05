import { BaseDomainEvent } from './DomainEvent';

export interface OrderCreatedEventPayload {
  orderId: string;
  customerId: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
}

export class OrderCreatedEvent extends BaseDomainEvent {
  readonly eventType = 'ORDER_CREATED';
  readonly aggregateId: string;
  readonly payload: OrderCreatedEventPayload;

  constructor(eventId: string, payload: OrderCreatedEventPayload) {
    super(eventId);
    this.aggregateId = payload.orderId;
    this.payload = Object.freeze({ ...payload });
  }

  get orderId(): string {
    return this.payload.orderId;
  }

  get customerId(): string {
    return this.payload.customerId;
  }

  get totalAmount(): number {
    return this.payload.totalAmount;
  }

  get currency(): string {
    return this.payload.currency;
  }

  get itemCount(): number {
    return this.payload.itemCount;
  }
}
