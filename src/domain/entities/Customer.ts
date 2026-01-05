import { CustomerTier, calculateTierFromPoints } from '../value-objects/CustomerTier';

export interface CustomerProps {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  avatarUrl?: string;
  isActive: boolean;
  isVerified: boolean;
  loyaltyPoints: number;
  tier: CustomerTier;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerProps {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  avatarUrl?: string;
}

export class Customer {
  private readonly _id: string;
  private _email: string;
  private _firstName: string;
  private _lastName: string;
  private _phone?: string;
  private _dateOfBirth?: Date;
  private _gender?: string;
  private _avatarUrl?: string;
  private _isActive: boolean;
  private _isVerified: boolean;
  private _loyaltyPoints: number;
  private _tier: CustomerTier;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: CustomerProps) {
    this._id = props.id;
    this._email = props.email;
    this._firstName = props.firstName;
    this._lastName = props.lastName;
    this._phone = props.phone;
    this._dateOfBirth = props.dateOfBirth;
    this._gender = props.gender;
    this._avatarUrl = props.avatarUrl;
    this._isActive = props.isActive;
    this._isVerified = props.isVerified;
    this._loyaltyPoints = props.loyaltyPoints;
    this._tier = props.tier;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: CreateCustomerProps): Customer {
    if (!props.email || !props.email.includes('@')) {
      throw new Error('Valid email is required');
    }
    if (!props.firstName || props.firstName.trim() === '') {
      throw new Error('First name is required');
    }
    if (!props.lastName || props.lastName.trim() === '') {
      throw new Error('Last name is required');
    }

    const now = new Date();
    return new Customer({
      ...props,
      isActive: true,
      isVerified: false,
      loyaltyPoints: 0,
      tier: CustomerTier.BRONZE,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: CustomerProps): Customer {
    return new Customer(props);
  }

  get id(): string { return this._id; }
  get email(): string { return this._email; }
  get firstName(): string { return this._firstName; }
  get lastName(): string { return this._lastName; }
  get fullName(): string { return `${this._firstName} ${this._lastName}`; }
  get phone(): string | undefined { return this._phone; }
  get dateOfBirth(): Date | undefined { return this._dateOfBirth; }
  get gender(): string | undefined { return this._gender; }
  get avatarUrl(): string | undefined { return this._avatarUrl; }
  get isActive(): boolean { return this._isActive; }
  get isVerified(): boolean { return this._isVerified; }
  get loyaltyPoints(): number { return this._loyaltyPoints; }
  get tier(): CustomerTier { return this._tier; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: Date;
    gender?: string;
    avatarUrl?: string;
  }): void {
    if (data.firstName) this._firstName = data.firstName;
    if (data.lastName) this._lastName = data.lastName;
    if (data.phone !== undefined) this._phone = data.phone;
    if (data.dateOfBirth !== undefined) this._dateOfBirth = data.dateOfBirth;
    if (data.gender !== undefined) this._gender = data.gender;
    if (data.avatarUrl !== undefined) this._avatarUrl = data.avatarUrl;
    this.touch();
  }

  updateEmail(email: string): void {
    if (!email || !email.includes('@')) {
      throw new Error('Valid email is required');
    }
    this._email = email;
    this._isVerified = false;
    this.touch();
  }

  verify(): void {
    this._isVerified = true;
    this.touch();
  }

  activate(): void {
    this._isActive = true;
    this.touch();
  }

  deactivate(): void {
    this._isActive = false;
    this.touch();
  }

  addLoyaltyPoints(points: number): void {
    if (points < 0) {
      throw new Error('Points cannot be negative');
    }
    this._loyaltyPoints += points;
    this._tier = calculateTierFromPoints(this._loyaltyPoints);
    this.touch();
  }

  deductLoyaltyPoints(points: number): void {
    if (points < 0) {
      throw new Error('Points cannot be negative');
    }
    if (points > this._loyaltyPoints) {
      throw new Error('Insufficient loyalty points');
    }
    this._loyaltyPoints -= points;
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toObject(): CustomerProps {
    return {
      id: this._id,
      email: this._email,
      firstName: this._firstName,
      lastName: this._lastName,
      phone: this._phone,
      dateOfBirth: this._dateOfBirth,
      gender: this._gender,
      avatarUrl: this._avatarUrl,
      isActive: this._isActive,
      isVerified: this._isVerified,
      loyaltyPoints: this._loyaltyPoints,
      tier: this._tier,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
