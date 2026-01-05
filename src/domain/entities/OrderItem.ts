import { Money } from '../value-objects/Money';

export interface OrderItemProps {
  id: string;
  productId: string;
  productName: string;
  unitPrice: Money;
  quantity: number;
}

export class OrderItem {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _productName: string;
  private readonly _unitPrice: Money;
  private _quantity: number;

  private constructor(props: OrderItemProps) {
    this._id = props.id;
    this._productId = props.productId;
    this._productName = props.productName;
    this._unitPrice = props.unitPrice;
    this._quantity = props.quantity;
  }

  static create(props: OrderItemProps): OrderItem {
    if (props.quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    return new OrderItem(props);
  }

  static reconstitute(props: OrderItemProps): OrderItem {
    return new OrderItem(props);
  }

  get id(): string {
    return this._id;
  }

  get productId(): string {
    return this._productId;
  }

  get productName(): string {
    return this._productName;
  }

  get unitPrice(): Money {
    return this._unitPrice;
  }

  get quantity(): number {
    return this._quantity;
  }

  calculateSubtotal(): Money {
    return this._unitPrice.multiply(this._quantity);
  }

  updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    this._quantity = newQuantity;
  }

  equals(other: OrderItem): boolean {
    return this._id === other._id;
  }
}
