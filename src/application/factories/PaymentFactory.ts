import { IPaymentStrategy } from '../interfaces/IPaymentStrategy';

export type PaymentMethodType = 'paypal' | 'credit_card';

export interface PaymentStrategyRegistry {
  paypal: IPaymentStrategy;
  credit_card: IPaymentStrategy;
}

export class PaymentFactory {
  private readonly strategies: Map<PaymentMethodType, IPaymentStrategy>;
  private readonly defaultMethod: PaymentMethodType;

  constructor(
    strategies: PaymentStrategyRegistry,
    defaultMethod: PaymentMethodType = 'credit_card'
  ) {
    this.strategies = new Map<PaymentMethodType, IPaymentStrategy>([
      ['paypal', strategies.paypal],
      ['credit_card', strategies.credit_card],
    ]);
    this.defaultMethod = defaultMethod;
  }

  createPaymentStrategy(method: PaymentMethodType): IPaymentStrategy {
    const strategy = this.strategies.get(method);

    if (!strategy) {
      console.warn(
        `[PaymentFactory] Unknown payment method: ${method}, falling back to ${this.defaultMethod}`
      );
      return this.getDefaultStrategy();
    }

    console.log(`[PaymentFactory] Created ${method} payment strategy`);
    return strategy;
  }

  getDefaultStrategy(): IPaymentStrategy {
    const strategy = this.strategies.get(this.defaultMethod);

    if (!strategy) {
      throw new Error(
        `Default payment strategy '${this.defaultMethod}' is not registered`
      );
    }

    return strategy;
  }

  isMethodSupported(method: string): method is PaymentMethodType {
    return this.strategies.has(method as PaymentMethodType);
  }

  getSupportedMethods(): PaymentMethodType[] {
    return Array.from(this.strategies.keys());
  }

  registerStrategy(method: PaymentMethodType, strategy: IPaymentStrategy): void {
    this.strategies.set(method, strategy);
    console.log(`[PaymentFactory] Registered strategy: ${method}`);
  }

  unregisterStrategy(method: PaymentMethodType): void {
    if (method === this.defaultMethod) {
      throw new Error('Cannot unregister the default payment strategy');
    }
    this.strategies.delete(method);
    console.log(`[PaymentFactory] Unregistered strategy: ${method}`);
  }
}
