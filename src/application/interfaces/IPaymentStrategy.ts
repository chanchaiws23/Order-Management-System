export interface PaymentDetails {
  orderId: string;
  amount: number;
  currency: string;
  customerId: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string | null;
  errorMessage?: string;
  processedAt: Date;
  paymentMethod: string;
}

export interface RefundDetails {
  transactionId: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string | null;
  errorMessage?: string;
  processedAt: Date;
}

export interface IPaymentStrategy {
  readonly strategyName: string;

  processPayment(details: PaymentDetails): Promise<PaymentResult>;

  refund(details: RefundDetails): Promise<RefundResult>;

  validatePaymentDetails(details: PaymentDetails): boolean;
}
