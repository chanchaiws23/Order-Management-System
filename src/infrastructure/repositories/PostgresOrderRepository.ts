import { Order, OrderProps } from '../../domain/entities/Order';
import { OrderItemProps } from '../../domain/entities/OrderItem';
import { OrderStatus } from '../../domain/value-objects/OrderStatus';
import { Money } from '../../domain/value-objects/Money';
import {
  IOrderRepository,
  OrderSearchCriteria,
  PaginationOptions,
  PaginatedResult,
} from '../../domain/repositories/IOrderRepository';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface OrderRow {
  id: string;
  customer_id: string;
  status: string;
  currency: string;
  shipping_address: string | null;
  billing_address: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: number;
}

export class PostgresOrderRepository implements IOrderRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async save(order: Order): Promise<void> {
    const props = order.toObject();
    const client = this.db.getPool();

    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO orders (id, customer_id, status, currency, shipping_address, billing_address, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           shipping_address = EXCLUDED.shipping_address,
           billing_address = EXCLUDED.billing_address,
           notes = EXCLUDED.notes,
           updated_at = EXCLUDED.updated_at`,
        [
          props.id,
          props.customerId,
          props.status,
          props.currency,
          props.shippingAddress || null,
          props.billingAddress || null,
          props.notes || null,
          props.createdAt,
          props.updatedAt,
        ]
      );

      await client.query('DELETE FROM order_items WHERE order_id = $1', [props.id]);

      for (const item of props.items) {
        await client.query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, unit_price, quantity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            item.id,
            props.id,
            item.productId,
            item.productName,
            item.unitPrice.amount,
            item.quantity,
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`[PostgresOrderRepository] Saved order: ${order.id}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  async findById(id: string): Promise<Order | null> {
    const orderResult = await this.db.query<OrderRow>(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return null;
    }

    const orderRow = orderResult.rows[0];
    const items = await this.getOrderItems(id, orderRow.currency);

    return this.toDomain(orderRow, items);
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const result = await this.db.query<OrderRow>(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );

    return this.mapOrders(result.rows);
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const result = await this.db.query<OrderRow>(
      'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );

    return this.mapOrders(result.rows);
  }

  async findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Order>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM orders');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<OrderRow>(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const orders = await this.mapOrders(result.rows);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async search(
    criteria: OrderSearchCriteria,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Order>> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.customerId) {
      conditions.push(`customer_id = $${paramIndex++}`);
      params.push(criteria.customerId);
    }

    if (criteria.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(criteria.status);
    }

    if (criteria.fromDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(criteria.fromDate);
    }

    if (criteria.toDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(criteria.toDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) FROM orders ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const result = await this.db.query<OrderRow>(
      `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    const orders = await this.mapOrders(result.rows);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async delete(id: string): Promise<void> {
    const result = await this.db.query('DELETE FROM orders WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new Error(`Order with ID ${id} not found`);
    }

    console.log(`[PostgresOrderRepository] Deleted order: ${id}`);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM orders WHERE id = $1)',
      [id]
    );
    return result.rows[0].exists;
  }

  async count(): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM orders');
    return parseInt(result.rows[0].count, 10);
  }

  async countByStatus(status: OrderStatus): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) FROM orders WHERE status = $1',
      [status]
    );
    return parseInt(result.rows[0].count, 10);
  }

  private async getOrderItems(orderId: string, currency: string): Promise<OrderItemProps[]> {
    const result = await this.db.query<OrderItemRow>(
      'SELECT * FROM order_items WHERE order_id = $1',
      [orderId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      unitPrice: Money.create(parseFloat(row.unit_price), currency),
      quantity: row.quantity,
    }));
  }

  private async mapOrders(rows: OrderRow[]): Promise<Order[]> {
    const orders: Order[] = [];

    for (const row of rows) {
      const items = await this.getOrderItems(row.id, row.currency);
      orders.push(this.toDomain(row, items));
    }

    return orders;
  }

  private toDomain(row: OrderRow, items: OrderItemProps[]): Order {
    const props: OrderProps = {
      id: row.id,
      customerId: row.customer_id,
      items,
      status: row.status as OrderStatus,
      currency: row.currency,
      shippingAddress: row.shipping_address ?? undefined,
      billingAddress: row.billing_address ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return Order.reconstitute(props);
  }
}
