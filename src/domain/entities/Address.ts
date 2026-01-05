export type AddressType = 'SHIPPING' | 'BILLING';

export interface AddressProps {
  id: string;
  customerId: string;
  type: AddressType;
  isDefault: boolean;
  recipientName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  district?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAddressProps {
  id: string;
  customerId: string;
  type: AddressType;
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
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export class Address {
  private readonly _id: string;
  private readonly _customerId: string;
  private _type: AddressType;
  private _isDefault: boolean;
  private _recipientName: string;
  private _phone?: string;
  private _addressLine1: string;
  private _addressLine2?: string;
  private _district?: string;
  private _city: string;
  private _province: string;
  private _postalCode: string;
  private _country: string;
  private _latitude?: number;
  private _longitude?: number;
  private _notes?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: AddressProps) {
    this._id = props.id;
    this._customerId = props.customerId;
    this._type = props.type;
    this._isDefault = props.isDefault;
    this._recipientName = props.recipientName;
    this._phone = props.phone;
    this._addressLine1 = props.addressLine1;
    this._addressLine2 = props.addressLine2;
    this._district = props.district;
    this._city = props.city;
    this._province = props.province;
    this._postalCode = props.postalCode;
    this._country = props.country;
    this._latitude = props.latitude;
    this._longitude = props.longitude;
    this._notes = props.notes;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: CreateAddressProps): Address {
    if (!props.recipientName || props.recipientName.trim() === '') {
      throw new Error('Recipient name is required');
    }
    if (!props.addressLine1 || props.addressLine1.trim() === '') {
      throw new Error('Address line 1 is required');
    }
    if (!props.city || props.city.trim() === '') {
      throw new Error('City is required');
    }
    if (!props.province || props.province.trim() === '') {
      throw new Error('Province is required');
    }
    if (!props.postalCode || props.postalCode.trim() === '') {
      throw new Error('Postal code is required');
    }

    const now = new Date();
    return new Address({
      ...props,
      isDefault: props.isDefault ?? false,
      country: props.country ?? 'Thailand',
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: AddressProps): Address {
    return new Address(props);
  }

  get id(): string { return this._id; }
  get customerId(): string { return this._customerId; }
  get type(): AddressType { return this._type; }
  get isDefault(): boolean { return this._isDefault; }
  get recipientName(): string { return this._recipientName; }
  get phone(): string | undefined { return this._phone; }
  get addressLine1(): string { return this._addressLine1; }
  get addressLine2(): string | undefined { return this._addressLine2; }
  get district(): string | undefined { return this._district; }
  get city(): string { return this._city; }
  get province(): string { return this._province; }
  get postalCode(): string { return this._postalCode; }
  get country(): string { return this._country; }
  get latitude(): number | undefined { return this._latitude; }
  get longitude(): number | undefined { return this._longitude; }
  get notes(): string | undefined { return this._notes; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  get fullAddress(): string {
    const parts = [
      this._addressLine1,
      this._addressLine2,
      this._district,
      this._city,
      this._province,
      this._postalCode,
      this._country,
    ].filter(Boolean);
    return parts.join(', ');
  }

  update(data: Partial<Omit<CreateAddressProps, 'id' | 'customerId'>>): void {
    if (data.type !== undefined) this._type = data.type;
    if (data.isDefault !== undefined) this._isDefault = data.isDefault;
    if (data.recipientName !== undefined) this._recipientName = data.recipientName;
    if (data.phone !== undefined) this._phone = data.phone;
    if (data.addressLine1 !== undefined) this._addressLine1 = data.addressLine1;
    if (data.addressLine2 !== undefined) this._addressLine2 = data.addressLine2;
    if (data.district !== undefined) this._district = data.district;
    if (data.city !== undefined) this._city = data.city;
    if (data.province !== undefined) this._province = data.province;
    if (data.postalCode !== undefined) this._postalCode = data.postalCode;
    if (data.country !== undefined) this._country = data.country;
    if (data.latitude !== undefined) this._latitude = data.latitude;
    if (data.longitude !== undefined) this._longitude = data.longitude;
    if (data.notes !== undefined) this._notes = data.notes;
    this.touch();
  }

  setAsDefault(): void {
    this._isDefault = true;
    this.touch();
  }

  unsetDefault(): void {
    this._isDefault = false;
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toObject(): AddressProps {
    return {
      id: this._id,
      customerId: this._customerId,
      type: this._type,
      isDefault: this._isDefault,
      recipientName: this._recipientName,
      phone: this._phone,
      addressLine1: this._addressLine1,
      addressLine2: this._addressLine2,
      district: this._district,
      city: this._city,
      province: this._province,
      postalCode: this._postalCode,
      country: this._country,
      latitude: this._latitude,
      longitude: this._longitude,
      notes: this._notes,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
