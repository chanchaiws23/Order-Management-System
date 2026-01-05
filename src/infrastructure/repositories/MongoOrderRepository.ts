import { Order, OrderProps } from '../../domain/entities/Order';
import { OrderStatus } from '../../domain/value-objects/OrderStatus';
import { Money } from '../../domain/value-objects/Money';
import {
  IOrderRepository,
  OrderSearchCriteria,
  PaginationOptions,
  PaginatedResult,
} from '../../domain/repositories/IOrderRepository';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface OrderDocument {
  _id: string;
  customerId: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    unitPrice: { amount: number; currency: string };
    quantity: number;
  }>;
  status: string;
  currency: string;
  shippingAddress?: string;
  billingAddress?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoOrderRepository implements IOrderRepository {
  private readonly collectionName = 'orders';
  private readonly storage: Map<string, OrderDocument> = new Map();

  constructor(private readonly dbConnection: DatabaseConnection) {}

  async save(order: Order): Promise<void> {
    this.dbConnection.ensureConnected();

    const document = this.toDocument(order);
    this.storage.set(document._id, document);

    console.log(`[MongoOrderRepository] Saved order: ${order.id}`);
  }

  async findById(id: string): Promise<Order | null> {
    this.dbConnection.ensureConnected();

    const document = this.storage.get(id);
    if (!document) {
      return null;
    }

    return this.toDomain(document);
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    this.dbConnection.ensureConnected();

    const orders: Order[] = [];
    for (const document of this.storage.values()) {
      if (document.customerId === customerId) {
        orders.push(this.toDomain(document));
      }
    }

    return orders;
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    this.dbConnection.ensureConnected();

    const orders: Order[] = [];
    for (const document of this.storage.values()) {
      if (document.status === status) {
        orders.push(this.toDomain(document));
      }
    }

    return orders;
  }

  async findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Order>> {
    this.dbConnection.ensureConnected();

    const allDocuments = Array.from(this.storage.values());
    return this.paginate(allDocuments, pagination);
  }

  async search(
    criteria: OrderSearchCriteria,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Order>> {
    this.dbConnection.ensureConnected();

    let filtered = Array.from(this.storage.values());

    if (criteria.customerId) {
      filtered = filtered.filter((doc) => doc.customerId === criteria.customerId);
    }

    if (criteria.status) {
      filtered = filtered.filter((doc) => doc.status === criteria.status);
    }

    if (criteria.fromDate) {
      filtered = filtered.filter(
        (doc) => new Date(doc.createdAt) >= criteria.fromDate!
      );
    }

    if (criteria.toDate) {
      filtered = filtered.filter(
        (doc) => new Date(doc.createdAt) <= criteria.toDate!
      );
    }

    if (criteria.minTotal !== undefined || criteria.maxTotal !== undefined) {
      filtered = filtered.filter((doc) => {
        const total = doc.items.reduce(
          (sum, item) => sum + item.unitPrice.amount * item.quantity,
          0
        );
        if (criteria.minTotal !== undefined && total < criteria.minTotal) {
          return false;
        }
        if (criteria.maxTotal !== undefined && total > criteria.maxTotal) {
          return false;
        }
        return true;
      });
    }

    return this.paginate(filtered, pagination);
  }

  async delete(id: string): Promise<void> {
    this.dbConnection.ensureConnected();

    const exists = this.storage.has(id);
    if (!exists) {
      throw new Error(`Order with ID ${id} not found`);
    }

    this.storage.delete(id);
    console.log(`[MongoOrderRepository] Deleted order: ${id}`);
  }

  async exists(id: string): Promise<boolean> {
    this.dbConnection.ensureConnected();
    return this.storage.has(id);
  }

  async count(): Promise<number> {
    this.dbConnection.ensureConnected();
    return this.storage.size;
  }

  async countByStatus(status: OrderStatus): Promise<number> {
    this.dbConnection.ensureConnected();

    let count = 0;
    for (const document of this.storage.values()) {
      if (document.status === status) {
        count++;
      }
    }

    return count;
  }

  private toDocument(order: Order): OrderDocument {
    const props = order.toObject();
    return {
      _id: props.id,
      customerId: props.customerId,
      items: props.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        unitPrice: {
          amount: item.unitPrice.amount,
          currency: item.unitPrice.currency,
        },
        quantity: item.quantity,
      })),
      status: props.status,
      currency: props.currency,
      shippingAddress: props.shippingAddress,
      billingAddress: props.billingAddress,
      notes: props.notes,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }

  private toDomain(document: OrderDocument): Order {
    const props: OrderProps = {
      id: document._id,
      customerId: document.customerId,
      items: document.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        unitPrice: Money.create(item.unitPrice.amount, item.unitPrice.currency),
        quantity: item.quantity,
      })),
      status: document.status as OrderStatus,
      currency: document.currency,
      shippingAddress: document.shippingAddress,
      billingAddress: document.billingAddress,
      notes: document.notes,
      createdAt: new Date(document.createdAt),
      updatedAt: new Date(document.updatedAt),
    };

    return Order.reconstitute(props);
  }

  private paginate(
    documents: OrderDocument[],
    pagination?: PaginationOptions
  ): PaginatedResult<Order> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const total = documents.length;
    const totalPages = Math.ceil(total / limit);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDocs = documents.slice(startIndex, endIndex);

    return {
      data: paginatedDocs.map((doc) => this.toDomain(doc)),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
