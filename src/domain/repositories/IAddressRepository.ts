import { Address, AddressType } from '../entities/Address';

export interface IAddressRepository {
  save(address: Address): Promise<void>;
  findById(id: string): Promise<Address | null>;
  findByCustomerId(customerId: string): Promise<Address[]>;
  findByCustomerIdAndType(customerId: string, type: AddressType): Promise<Address[]>;
  findDefaultByCustomerId(customerId: string, type: AddressType): Promise<Address | null>;
  delete(id: string): Promise<void>;
  deleteByCustomerId(customerId: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  count(): Promise<number>;
}
