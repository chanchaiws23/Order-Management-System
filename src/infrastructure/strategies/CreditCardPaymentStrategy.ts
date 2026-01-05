import {
  IPaymentStrategy,
  PaymentDetails,
  PaymentResult,
  RefundDetails,
  RefundResult,
} from '../../application/interfaces/IPaymentStrategy';

interface CreditCardConfig {
  apiKey: string;
  merchantId: string;
  environment: 'sandbox' | 'production';
}

interface CreditCardApiResponse {
  transactionId: string;
  status: 'approved' | 'declined' | 'pending' | 'refunded';
  authorizationCode?: string;
  errorCode?: string;
  errorMessage?: string;
}

export class CreditCardPaymentStrategy implements IPaymentStrategy {
  readonly strategyName = 'credit_card';
  private readonly config: CreditCardConfig;

  constructor(config: CreditCardConfig) {
    this.config = config;
  }

  async processPayment(details: PaymentDetails): Promise<PaymentResult> {
    console.log(
      `[CreditCardPaymentStrategy] Processing payment for order: ${details.orderId}`
    );

    if (!this.validatePaymentDetails(details)) {
      return {
        success: false,
        transactionId: null,
        errorMessage: 'Invalid payment details',
        processedAt: new Date(),
        paymentMethod: this.strategyName,
      };
    }

    try {
      const response = await this.callPaymentGateway('charge', {
        amount: details.amount,
        currency: details.currency,
        orderId: details.orderId,
        customerId: details.customerId,
        metadata: details.metadata,
      });

      if (response.status === 'approved') {
        console.log(
          `[CreditCardPaymentStrategy] Payment approved: ${response.transactionId}`
        );
        return {
          success: true,
          transactionId: response.transactionId,
          processedAt: new Date(),
          paymentMethod: this.strategyName,
        };
      }

      return {
        success: false,
        transactionId: null,
        errorMessage: response.errorMessage ?? `Payment ${response.status}`,
        processedAt: new Date(),
        paymentMethod: this.strategyName,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CreditCardPaymentStrategy] Payment error: ${errorMessage}`);

      return {
        success: false,
        transactionId: null,
        errorMessage,
        processedAt: new Date(),
        paymentMethod: this.strategyName,
      };
    }
  }

  async refund(details: RefundDetails): Promise<RefundResult> {
    console.log(
      `[CreditCardPaymentStrategy] Processing refund for transaction: ${details.transactionId}`
    );

    try {
      const response = await this.callPaymentGateway('refund', {
        transactionId: details.transactionId,
        amount: details.amount,
        reason: details.reason,
      });

      if (response.status === 'refunded') {
        console.log(
          `[CreditCardPaymentStrategy] Refund successful: ${response.transactionId}`
        );
        return {
          success: true,
          refundId: response.transactionId,
          processedAt: new Date(),
        };
      }

      return {
        success: false,
        refundId: null,
        errorMessage: response.errorMessage ?? 'Refund failed',
        processedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CreditCardPaymentStrategy] Refund error: ${errorMessage}`);

      return {
        success: false,
        refundId: null,
        errorMessage,
        processedAt: new Date(),
      };
    }
  }

  validatePaymentDetails(details: PaymentDetails): boolean {
    if (!details.orderId || details.orderId.trim() === '') {
      return false;
    }
    if (!details.amount || details.amount <= 0) {
      return false;
    }
    if (!details.currency || details.currency.length !== 3) {
      return false;
    }
    if (!details.customerId || details.customerId.trim() === '') {
      return false;
    }
    return true;
  }

  private async callPaymentGateway(
    operation: string,
    payload: Record<string, unknown>
  ): Promise<CreditCardApiResponse> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const shouldDecline = Math.random() < 0.03;

    if (shouldDecline) {
      return {
        transactionId: '',
        status: 'declined',
        errorCode: 'CARD_DECLINED',
        errorMessage: 'The card was declined by the issuing bank',
      };
    }

    const transactionId = `CC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (operation === 'refund') {
      return {
        transactionId: `REF_${transactionId}`,
        status: 'refunded',
      };
    }

    return {
      transactionId,
      status: 'approved',
      authorizationCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
    };
  }
}
