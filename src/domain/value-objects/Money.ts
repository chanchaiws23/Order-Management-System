export class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: string
  ) {
    if (_amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
    if (!_currency || _currency.length !== 3) {
      throw new Error('Currency must be a valid 3-letter ISO code');
    }
  }

  static create(amount: number, currency: string): Money {
    return new Money(amount, currency);
  }

  static zero(currency: string): Money {
    return new Money(0, currency);
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    const result = this._amount - other._amount;
    if (result < 0) {
      throw new Error('Result cannot be negative');
    }
    return new Money(result, this._currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Factor cannot be negative');
    }
    return new Money(this._amount * factor, this._currency);
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount > other._amount;
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount < other._amount;
  }

  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(
        `Currency mismatch: ${this._currency} vs ${other._currency}`
      );
    }
  }

  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }
}
