import { Payment, PaymentProps, PaymentStatus } from '../../domain/entities/Payment';
import { IPaymentRepository } from '../../domain/repositories/IPaymentRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface PaymentRow {
  id: string;
  order_id: string;
  payment_method: string;
  gateway: string;
  transaction_id: string | null;
  amount: string;
  currency: string;
  status: string;
  gateway_response: Record<string, unknown> | null;
  error_message: string | null;
  refunded_amount: string;
  paid_at: Date | null;
  refunded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class PostgresPaymentRepository implements IPaymentRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async save(payment: Payment): Promise<void> {
    const p = payment.toObject();
    await this.db.query(
      `INSERT INTO payments (id, order_id, payment_method, gateway, transaction_id, amount, currency, status, gateway_response, error_message, refunded_amount, paid_at, refunded_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO UPDATE SET
         transaction_id=EXCLUDED.transaction_id, status=EXCLUDED.status, gateway_response=EXCLUDED.gateway_response,
         error_message=EXCLUDED.error_message, refunded_amount=EXCLUDED.refunded_amount, paid_at=EXCLUDED.paid_at,
         refunded_at=EXCLUDED.refunded_at, updated_at=EXCLUDED.updated_at`,
      [p.id, p.orderId, p.paymentMethod, p.gateway, p.transactionId||null, p.amount, p.currency, p.status,
       p.gatewayResponse ? JSON.stringify(p.gatewayResponse) : null, p.errorMessage||null, p.refundedAmount,
       p.paidAt||null, p.refundedAt||null, p.createdAt, p.updatedAt]
    );
  }

  async findById(id: string): Promise<Payment | null> {
    const result = await this.db.query<PaymentRow>('SELECT * FROM payments WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findByOrderId(orderId: string): Promise<Payment[]> {
    const result = await this.db.query<PaymentRow>('SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC', [orderId]);
    return result.rows.map(row => this.toDomain(row));
  }

  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    const result = await this.db.query<PaymentRow>('SELECT * FROM payments WHERE transaction_id = $1', [transactionId]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findByStatus(status: PaymentStatus, pagination?: PaginationOptions): Promise<PaginatedResult<Payment>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM payments WHERE status = $1', [status]);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<PaymentRow>(
      'SELECT * FROM payments WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [status, limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Payment>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM payments');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<PaymentRow>('SELECT * FROM payments ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM payments WHERE id = $1', [id]);
  }

  async count(): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM payments');
    return parseInt(result.rows[0].count, 10);
  }

  async sumByStatus(status: PaymentStatus): Promise<number> {
    const result = await this.db.query<{ sum: string | null }>('SELECT SUM(amount) FROM payments WHERE status = $1', [status]);
    return result.rows[0].sum ? parseFloat(result.rows[0].sum) : 0;
  }

  private toDomain(row: PaymentRow): Payment {
    const props: PaymentProps = {
      id: row.id, orderId: row.order_id, paymentMethod: row.payment_method, gateway: row.gateway,
      transactionId: row.transaction_id ?? undefined, amount: parseFloat(row.amount), currency: row.currency,
      status: row.status as PaymentStatus, gatewayResponse: row.gateway_response ?? undefined,
      errorMessage: row.error_message ?? undefined, refundedAmount: parseFloat(row.refunded_amount),
      paidAt: row.paid_at ?? undefined, refundedAt: row.refunded_at ?? undefined,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    };
    return Payment.reconstitute(props);
  }
}
