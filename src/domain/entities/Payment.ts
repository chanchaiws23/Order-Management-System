export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentProps {
  id: string;
  orderId: string;
  paymentMethod: string;
  gateway: string;
  transactionId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gatewayResponse?: Record<string, unknown>;
  errorMessage?: string;
  refundedAmount: number;
  paidAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentProps {
  id: string;
  orderId: string;
  paymentMethod: string;
  gateway: string;
  amount: number;
  currency?: string;
}

export class Payment {
  private readonly _id: string;
  private readonly _orderId: string;
  private readonly _paymentMethod: string;
  private readonly _gateway: string;
  private _transactionId?: string;
  private readonly _amount: number;
  private readonly _currency: string;
  private _status: PaymentStatus;
  private _gatewayResponse?: Record<string, unknown>;
  private _errorMessage?: string;
  private _refundedAmount: number;
  private _paidAt?: Date;
  private _refundedAt?: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: PaymentProps) {
    this._id = props.id;
    this._orderId = props.orderId;
    this._paymentMethod = props.paymentMethod;
    this._gateway = props.gateway;
    this._transactionId = props.transactionId;
    this._amount = props.amount;
    this._currency = props.currency;
    this._status = props.status;
    this._gatewayResponse = props.gatewayResponse;
    this._errorMessage = props.errorMessage;
    this._refundedAmount = props.refundedAmount;
    this._paidAt = props.paidAt;
    this._refundedAt = props.refundedAt;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: CreatePaymentProps): Payment {
    if (props.amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    const now = new Date();
    return new Payment({
      ...props,
      currency: props.currency ?? 'THB',
      status: 'PENDING',
      refundedAmount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: PaymentProps): Payment {
    return new Payment(props);
  }

  get id(): string { return this._id; }
  get orderId(): string { return this._orderId; }
  get paymentMethod(): string { return this._paymentMethod; }
  get gateway(): string { return this._gateway; }
  get transactionId(): string | undefined { return this._transactionId; }
  get amount(): number { return this._amount; }
  get currency(): string { return this._currency; }
  get status(): PaymentStatus { return this._status; }
  get gatewayResponse(): Record<string, unknown> | undefined { return this._gatewayResponse; }
  get errorMessage(): string | undefined { return this._errorMessage; }
  get refundedAmount(): number { return this._refundedAmount; }
  get paidAt(): Date | undefined { return this._paidAt; }
  get refundedAt(): Date | undefined { return this._refundedAt; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  get isPaid(): boolean { return this._status === 'SUCCESS'; }
  get isRefunded(): boolean { return this._status === 'REFUNDED'; }
  get refundableAmount(): number { return this._amount - this._refundedAmount; }

  markAsSuccess(transactionId: string, gatewayResponse?: Record<string, unknown>): void {
    this._status = 'SUCCESS';
    this._transactionId = transactionId;
    this._gatewayResponse = gatewayResponse;
    this._paidAt = new Date();
    this.touch();
  }

  markAsFailed(errorMessage: string, gatewayResponse?: Record<string, unknown>): void {
    this._status = 'FAILED';
    this._errorMessage = errorMessage;
    this._gatewayResponse = gatewayResponse;
    this.touch();
  }

  refund(amount: number): void {
    if (this._status !== 'SUCCESS') {
      throw new Error('Can only refund successful payments');
    }
    if (amount > this.refundableAmount) {
      throw new Error('Refund amount exceeds refundable amount');
    }

    this._refundedAmount += amount;
    if (this._refundedAmount >= this._amount) {
      this._status = 'REFUNDED';
    }
    this._refundedAt = new Date();
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toObject(): PaymentProps {
    return {
      id: this._id,
      orderId: this._orderId,
      paymentMethod: this._paymentMethod,
      gateway: this._gateway,
      transactionId: this._transactionId,
      amount: this._amount,
      currency: this._currency,
      status: this._status,
      gatewayResponse: this._gatewayResponse,
      errorMessage: this._errorMessage,
      refundedAmount: this._refundedAmount,
      paidAt: this._paidAt,
      refundedAt: this._refundedAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
