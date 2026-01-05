import { Customer } from '../../domain/entities/Customer';
import { Address } from '../../domain/entities/Address';
import { ICustomerRepository, CustomerSearchCriteria } from '../../domain/repositories/ICustomerRepository';
import { IAddressRepository } from '../../domain/repositories/IAddressRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';
import { IdGenerator } from './CreateOrderUseCase';

export interface CreateCustomerDTO {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface UpdateCustomerDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  avatarUrl?: string;
}

export interface CreateAddressDTO {
  customerId: string;
  type: 'SHIPPING' | 'BILLING';
  isDefault?: boolean;
  recipientName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  district?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
}

export class CustomerUseCases {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly addressRepo: IAddressRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async createCustomer(dto: CreateCustomerDTO): Promise<Customer> {
    const exists = await this.customerRepo.existsByEmail(dto.email);
    if (exists) {
      throw new Error('Email already registered');
    }

    const customer = Customer.create({
      id: this.idGenerator.generate(),
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender,
    });

    await this.customerRepo.save(customer);
    return customer;
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    return this.customerRepo.findById(id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    return this.customerRepo.findByEmail(email);
  }

  async updateCustomer(id: string, dto: UpdateCustomerDTO): Promise<Customer> {
    const customer = await this.customerRepo.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    customer.updateProfile({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender,
      avatarUrl: dto.avatarUrl,
    });

    await this.customerRepo.save(customer);
    return customer;
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.addressRepo.deleteByCustomerId(id);
    await this.customerRepo.delete(id);
  }

  async searchCustomers(criteria: CustomerSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<Customer>> {
    return this.customerRepo.search(criteria, pagination);
  }

  async getAllCustomers(pagination?: PaginationOptions): Promise<PaginatedResult<Customer>> {
    return this.customerRepo.findAll(pagination);
  }

  async addLoyaltyPoints(customerId: string, points: number): Promise<Customer> {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    customer.addLoyaltyPoints(points);
    await this.customerRepo.save(customer);
    return customer;
  }

  async verifyCustomer(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    customer.verify();
    await this.customerRepo.save(customer);
    return customer;
  }

  async createAddress(dto: CreateAddressDTO): Promise<Address> {
    const customer = await this.customerRepo.findById(dto.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const address = Address.create({
      id: this.idGenerator.generate(),
      ...dto,
    });

    if (dto.isDefault) {
      const existingAddresses = await this.addressRepo.findByCustomerIdAndType(dto.customerId, dto.type);
      for (const addr of existingAddresses) {
        if (addr.isDefault) {
          addr.unsetDefault();
          await this.addressRepo.save(addr);
        }
      }
    }

    await this.addressRepo.save(address);
    return address;
  }

  async getCustomerAddresses(customerId: string): Promise<Address[]> {
    return this.addressRepo.findByCustomerId(customerId);
  }

  async deleteAddress(id: string): Promise<void> {
    await this.addressRepo.delete(id);
  }
}
