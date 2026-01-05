import { Address, AddressProps, AddressType } from '../../domain/entities/Address';
import { IAddressRepository } from '../../domain/repositories/IAddressRepository';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface AddressRow {
  id: string;
  customer_id: string;
  type: string;
  is_default: boolean;
  recipient_name: string;
  phone: string | null;
  address_line_1: string;
  address_line_2: string | null;
  district: string | null;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export class PostgresAddressRepository implements IAddressRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async save(address: Address): Promise<void> {
    const p = address.toObject();
    await this.db.query(
      `INSERT INTO addresses (id, customer_id, type, is_default, recipient_name, phone, address_line_1, address_line_2, district, city, province, postal_code, country, latitude, longitude, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO UPDATE SET
         type=EXCLUDED.type, is_default=EXCLUDED.is_default, recipient_name=EXCLUDED.recipient_name, phone=EXCLUDED.phone,
         address_line_1=EXCLUDED.address_line_1, address_line_2=EXCLUDED.address_line_2, district=EXCLUDED.district,
         city=EXCLUDED.city, province=EXCLUDED.province, postal_code=EXCLUDED.postal_code, country=EXCLUDED.country,
         latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, notes=EXCLUDED.notes, updated_at=EXCLUDED.updated_at`,
      [p.id, p.customerId, p.type, p.isDefault, p.recipientName, p.phone||null, p.addressLine1, p.addressLine2||null,
       p.district||null, p.city, p.province, p.postalCode, p.country, p.latitude||null, p.longitude||null, p.notes||null,
       p.createdAt, p.updatedAt]
    );
  }

  async findById(id: string): Promise<Address | null> {
    const result = await this.db.query<AddressRow>('SELECT * FROM addresses WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findByCustomerId(customerId: string): Promise<Address[]> {
    const result = await this.db.query<AddressRow>('SELECT * FROM addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC', [customerId]);
    return result.rows.map(row => this.toDomain(row));
  }

  async findByCustomerIdAndType(customerId: string, type: AddressType): Promise<Address[]> {
    const result = await this.db.query<AddressRow>(
      'SELECT * FROM addresses WHERE customer_id = $1 AND type = $2 ORDER BY is_default DESC, created_at DESC', [customerId, type]
    );
    return result.rows.map(row => this.toDomain(row));
  }

  async findDefaultByCustomerId(customerId: string, type: AddressType): Promise<Address | null> {
    const result = await this.db.query<AddressRow>(
      'SELECT * FROM addresses WHERE customer_id = $1 AND type = $2 AND is_default = true LIMIT 1', [customerId, type]
    );
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM addresses WHERE id = $1', [id]);
  }

  async deleteByCustomerId(customerId: string): Promise<void> {
    await this.db.query('DELETE FROM addresses WHERE customer_id = $1', [customerId]);
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM addresses WHERE id = $1)', [id]);
    return result.rows[0].exists;
  }

  async count(): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM addresses');
    return parseInt(result.rows[0].count, 10);
  }

  private toDomain(row: AddressRow): Address {
    const props: AddressProps = {
      id: row.id, customerId: row.customer_id, type: row.type as AddressType, isDefault: row.is_default,
      recipientName: row.recipient_name, phone: row.phone ?? undefined, addressLine1: row.address_line_1,
      addressLine2: row.address_line_2 ?? undefined, district: row.district ?? undefined, city: row.city,
      province: row.province, postalCode: row.postal_code, country: row.country,
      latitude: row.latitude ? parseFloat(row.latitude) : undefined, longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      notes: row.notes ?? undefined, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    };
    return Address.reconstitute(props);
  }
}
