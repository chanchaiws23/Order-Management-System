import { Customer } from '../entities/Customer';
import { PaginationOptions, PaginatedResult } from './IOrderRepository';

export interface CustomerSearchCriteria {
  email?: string;
  name?: string;
  tier?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface ICustomerRepository {
  save(customer: Customer): Promise<void>;
  findById(id: string): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  findAll(pagination?: PaginationOptions): Promise<PaginatedResult<Customer>>;
  search(criteria: CustomerSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<Customer>>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  count(): Promise<number>;
}
