import { OrderItem, OrderItemProps } from './OrderItem';
import { Money } from '../value-objects/Money';
import { OrderStatus, canTransitionTo } from '../value-objects/OrderStatus';
import { DomainEvent } from '../events/DomainEvent';
import { OrderCreatedEvent } from '../events/OrderCreatedEvent';

export interface OrderProps {
  id: string;
  customerId: string;
  items: OrderItemProps[];
  status: OrderStatus;
  currency: string;
  shippingAddress?: string;
  billingAddress?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderProps {
  id: string;
  customerId: string;
  items: OrderItemProps[];
  currency: string;
  shippingAddress?: string;
  billingAddress?: string;
  notes?: string;
  eventIdGenerator: () => string;
}

export class Order {
  private readonly _id: string;
  private readonly _customerId: string;
  private readonly _items: OrderItem[];
  private _status: OrderStatus;
  private readonly _currency: string;
  private _shippingAddress?: string;
  private _billingAddress?: string;
  private _notes?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private readonly _domainEvents: DomainEvent[] = [];

  private constructor(props: OrderProps) {
    this._id = props.id;
    this._customerId = props.customerId;
    this._items = props.items.map((item) => OrderItem.reconstitute(item));
    this._status = props.status;
    this._currency = props.currency;
    this._shippingAddress = props.shippingAddress;
    this._billingAddress = props.billingAddress;
    this._notes = props.notes;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: CreateOrderProps): Order {
    if (!props.customerId) {
      throw new Error('Customer ID is required');
    }
    if (!props.items || props.items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    const now = new Date();
    const order = new Order({
      id: props.id,
      customerId: props.customerId,
      items: props.items,
      status: OrderStatus.PENDING,
      currency: props.currency,
      shippingAddress: props.shippingAddress,
      billingAddress: props.billingAddress,
      notes: props.notes,
      createdAt: now,
      updatedAt: now,
    });

    const total = order.calculateTotal();
    order.addDomainEvent(
      new OrderCreatedEvent(props.eventIdGenerator(), {
        orderId: order._id,
        customerId: order._customerId,
        totalAmount: total.amount,
        currency: total.currency,
        itemCount: order._items.length,
      })
    );

    return order;
  }

  static reconstitute(props: OrderProps): Order {
    return new Order(props);
  }

  get id(): string {
    return this._id;
  }

  get customerId(): string {
    return this._customerId;
  }

  get items(): ReadonlyArray<OrderItem> {
    return [...this._items];
  }

  get status(): OrderStatus {
    return this._status;
  }

  get currency(): string {
    return this._currency;
  }

  get shippingAddress(): string | undefined {
    return this._shippingAddress;
  }

  get billingAddress(): string | undefined {
    return this._billingAddress;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  calculateTotal(): Money {
    return this._items.reduce(
      (total, item) => total.add(item.calculateSubtotal()),
      Money.zero(this._currency)
    );
  }

  calculateItemCount(): number {
    return this._items.reduce((count, item) => count + item.quantity, 0);
  }

  addItem(itemProps: OrderItemProps): void {
    this.ensureModifiable();
    
    const existingItem = this._items.find(
      (item) => item.productId === itemProps.productId
    );

    if (existingItem) {
      existingItem.updateQuantity(existingItem.quantity + itemProps.quantity);
    } else {
      this._items.push(OrderItem.create(itemProps));
    }
    
    this.touch();
  }

  removeItem(itemId: string): void {
    this.ensureModifiable();
    
    const index = this._items.findIndex((item) => item.id === itemId);
    if (index === -1) {
      throw new Error(`Item with ID ${itemId} not found`);
    }
    
    this._items.splice(index, 1);
    
    if (this._items.length === 0) {
      throw new Error('Order must have at least one item');
    }
    
    this.touch();
  }

  updateItemQuantity(itemId: string, quantity: number): void {
    this.ensureModifiable();
    
    const item = this._items.find((i) => i.id === itemId);
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }
    
    item.updateQuantity(quantity);
    this.touch();
  }

  updateStatus(newStatus: OrderStatus): void {
    if (!canTransitionTo(this._status, newStatus)) {
      throw new Error(
        `Invalid status transition from ${this._status} to ${newStatus}`
      );
    }
    
    this._status = newStatus;
    this.touch();
  }

  confirm(): void {
    this.updateStatus(OrderStatus.CONFIRMED);
  }

  process(): void {
    this.updateStatus(OrderStatus.PROCESSING);
  }

  ship(): void {
    this.updateStatus(OrderStatus.SHIPPED);
  }

  deliver(): void {
    this.updateStatus(OrderStatus.DELIVERED);
  }

  cancel(): void {
    this.updateStatus(OrderStatus.CANCELLED);
  }

  refund(): void {
    this.updateStatus(OrderStatus.REFUNDED);
  }

  updateShippingAddress(address: string): void {
    this.ensureModifiable();
    this._shippingAddress = address;
    this.touch();
  }

  updateBillingAddress(address: string): void {
    this.ensureModifiable();
    this._billingAddress = address;
    this.touch();
  }

  updateNotes(notes: string): void {
    this._notes = notes;
    this.touch();
  }

  isModifiable(): boolean {
    return (
      this._status === OrderStatus.PENDING ||
      this._status === OrderStatus.CONFIRMED
    );
  }

  isCancellable(): boolean {
    return (
      this._status === OrderStatus.PENDING ||
      this._status === OrderStatus.CONFIRMED ||
      this._status === OrderStatus.PROCESSING
    );
  }

  isCompleted(): boolean {
    return (
      this._status === OrderStatus.DELIVERED ||
      this._status === OrderStatus.CANCELLED ||
      this._status === OrderStatus.REFUNDED
    );
  }

  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  private ensureModifiable(): void {
    if (!this.isModifiable()) {
      throw new Error(
        `Order cannot be modified in ${this._status} status`
      );
    }
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toObject(): OrderProps {
    return {
      id: this._id,
      customerId: this._customerId,
      items: this._items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      })),
      status: this._status,
      currency: this._currency,
      shippingAddress: this._shippingAddress,
      billingAddress: this._billingAddress,
      notes: this._notes,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
