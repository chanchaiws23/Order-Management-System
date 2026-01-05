import {
  IPaymentStrategy,
  PaymentDetails,
  PaymentResult,
  RefundDetails,
  RefundResult,
} from '../../application/interfaces/IPaymentStrategy';

interface PaypalConfig {
  clientId: string;
  clientSecret: string;
  sandboxMode: boolean;
}

interface PaypalApiResponse {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
  error?: {
    name: string;
    message: string;
  };
}

export class PaypalPaymentStrategy implements IPaymentStrategy {
  readonly strategyName = 'paypal';
  private readonly config: PaypalConfig;

  constructor(config: PaypalConfig) {
    this.config = config;
  }

  async processPayment(details: PaymentDetails): Promise<PaymentResult> {
    console.log(
      `[PaypalPaymentStrategy] Processing payment for order: ${details.orderId}`
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
      const response = await this.callPaypalApi('create-payment', {
        amount: details.amount,
        currency: details.currency,
        reference: details.orderId,
        customer: details.customerId,
      });

      if (response.status === 'COMPLETED') {
        console.log(
          `[PaypalPaymentStrategy] Payment successful: ${response.id}`
        );
        return {
          success: true,
          transactionId: response.id,
          processedAt: new Date(),
          paymentMethod: this.strategyName,
        };
      }

      return {
        success: false,
        transactionId: null,
        errorMessage: response.error?.message ?? 'Payment failed',
        processedAt: new Date(),
        paymentMethod: this.strategyName,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[PaypalPaymentStrategy] Payment error: ${errorMessage}`);

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
      `[PaypalPaymentStrategy] Processing refund for transaction: ${details.transactionId}`
    );

    try {
      const response = await this.callPaypalApi('refund', {
        transactionId: details.transactionId,
        amount: details.amount,
        reason: details.reason,
      });

      if (response.status === 'REFUNDED') {
        console.log(`[PaypalPaymentStrategy] Refund successful: ${response.id}`);
        return {
          success: true,
          refundId: response.id,
          processedAt: new Date(),
        };
      }

      return {
        success: false,
        refundId: null,
        errorMessage: response.error?.message ?? 'Refund failed',
        processedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[PaypalPaymentStrategy] Refund error: ${errorMessage}`);

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

  private async callPaypalApi(
    endpoint: string,
    payload: Record<string, unknown>
  ): Promise<PaypalApiResponse> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const shouldFail = Math.random() < 0.02;

    if (shouldFail) {
      return {
        id: '',
        status: 'FAILED',
        error: {
          name: 'PAYMENT_ERROR',
          message: 'Simulated PayPal API failure',
        },
      };
    }

    const transactionId = `PP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (endpoint === 'refund') {
      return {
        id: `REF_${transactionId}`,
        status: 'REFUNDED',
      };
    }

    return {
      id: transactionId,
      status: 'COMPLETED',
    };
  }
}
