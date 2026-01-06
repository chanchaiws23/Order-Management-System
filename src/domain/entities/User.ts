import { Role } from '../value-objects/Role';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  passwordChangedAt: Date;
  refreshTokenHash?: string;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role?: Role;
}

export class User {
  private readonly _id: string;
  private _email: string;
  private _passwordHash: string;
  private _firstName: string;
  private _lastName: string;
  private _role: Role;
  private _isActive: boolean;
  private _isEmailVerified: boolean;
  private _failedLoginAttempts: number;
  private _lockedUntil?: Date;
  private _lastLoginAt?: Date;
  private _lastLoginIp?: string;
  private _passwordChangedAt: Date;
  private _refreshTokenHash?: string;
  private _twoFactorSecret?: string;
  private _twoFactorEnabled: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCK_DURATION_MINUTES = 30;

  private constructor(props: UserProps) {
    this._id = props.id;
    this._email = props.email;
    this._passwordHash = props.passwordHash;
    this._firstName = props.firstName;
    this._lastName = props.lastName;
    this._role = props.role;
    this._isActive = props.isActive;
    this._isEmailVerified = props.isEmailVerified;
    this._failedLoginAttempts = props.failedLoginAttempts;
    this._lockedUntil = props.lockedUntil;
    this._lastLoginAt = props.lastLoginAt;
    this._lastLoginIp = props.lastLoginIp;
    this._passwordChangedAt = props.passwordChangedAt;
    this._refreshTokenHash = props.refreshTokenHash;
    this._twoFactorSecret = props.twoFactorSecret;
    this._twoFactorEnabled = props.twoFactorEnabled;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: CreateUserProps): User {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(props.email)) {
      throw new Error('Invalid email format');
    }
    if (!props.firstName || props.firstName.trim() === '') {
      throw new Error('First name is required');
    }
    if (!props.lastName || props.lastName.trim() === '') {
      throw new Error('Last name is required');
    }

    const now = new Date();
    return new User({
      ...props,
      role: props.role ?? Role.CUSTOMER,
      isActive: true,
      isEmailVerified: false,
      failedLoginAttempts: 0,
      passwordChangedAt: now,
      twoFactorEnabled: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  get id(): string { return this._id; }
  get email(): string { return this._email; }
  get passwordHash(): string { return this._passwordHash; }
  get firstName(): string { return this._firstName; }
  get lastName(): string { return this._lastName; }
  get fullName(): string { return `${this._firstName} ${this._lastName}`; }
  get role(): Role { return this._role; }
  get isActive(): boolean { return this._isActive; }
  get isEmailVerified(): boolean { return this._isEmailVerified; }
  get failedLoginAttempts(): number { return this._failedLoginAttempts; }
  get lockedUntil(): Date | undefined { return this._lockedUntil; }
  get lastLoginAt(): Date | undefined { return this._lastLoginAt; }
  get lastLoginIp(): string | undefined { return this._lastLoginIp; }
  get passwordChangedAt(): Date { return this._passwordChangedAt; }
  get refreshTokenHash(): string | undefined { return this._refreshTokenHash; }
  get twoFactorSecret(): string | undefined { return this._twoFactorSecret; }
  get twoFactorEnabled(): boolean { return this._twoFactorEnabled; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  get isLocked(): boolean {
    if (!this._lockedUntil) return false;
    return new Date() < this._lockedUntil;
  }

  get canLogin(): boolean {
    return this._isActive && !this.isLocked;
  }

  recordSuccessfulLogin(ip: string): void {
    this._failedLoginAttempts = 0;
    this._lockedUntil = undefined;
    this._lastLoginAt = new Date();
    this._lastLoginIp = ip;
    this.touch();
  }

  recordFailedLogin(): void {
    this._failedLoginAttempts++;
    if (this._failedLoginAttempts >= User.MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + User.LOCK_DURATION_MINUTES);
      this._lockedUntil = lockUntil;
    }
    this.touch();
  }

  changePassword(newPasswordHash: string): void {
    this._passwordHash = newPasswordHash;
    this._passwordChangedAt = new Date();
    this._refreshTokenHash = undefined;
    this.touch();
  }

  setRefreshToken(tokenHash: string): void {
    this._refreshTokenHash = tokenHash;
    this.touch();
  }

  clearRefreshToken(): void {
    this._refreshTokenHash = undefined;
    this.touch();
  }

  verifyEmail(): void {
    this._isEmailVerified = true;
    this.touch();
  }

  enable2FA(secret: string): void {
    this._twoFactorSecret = secret;
    this._twoFactorEnabled = true;
    this.touch();
  }

  disable2FA(): void {
    this._twoFactorSecret = undefined;
    this._twoFactorEnabled = false;
    this.touch();
  }

  updateRole(role: Role): void {
    this._role = role;
    this.touch();
  }

  activate(): void {
    this._isActive = true;
    this._failedLoginAttempts = 0;
    this._lockedUntil = undefined;
    this.touch();
  }

  deactivate(): void {
    this._isActive = false;
    this._refreshTokenHash = undefined;
    this.touch();
  }

  updateProfile(data: { firstName?: string; lastName?: string }): void {
    if (data.firstName) this._firstName = data.firstName;
    if (data.lastName) this._lastName = data.lastName;
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toObject(): UserProps {
    return {
      id: this._id,
      email: this._email,
      passwordHash: this._passwordHash,
      firstName: this._firstName,
      lastName: this._lastName,
      role: this._role,
      isActive: this._isActive,
      isEmailVerified: this._isEmailVerified,
      failedLoginAttempts: this._failedLoginAttempts,
      lockedUntil: this._lockedUntil,
      lastLoginAt: this._lastLoginAt,
      lastLoginIp: this._lastLoginIp,
      passwordChangedAt: this._passwordChangedAt,
      refreshTokenHash: this._refreshTokenHash,
      twoFactorSecret: this._twoFactorSecret,
      twoFactorEnabled: this._twoFactorEnabled,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  toSafeObject(): Omit<UserProps, 'passwordHash' | 'refreshTokenHash' | 'twoFactorSecret'> {
    const obj = this.toObject();
    const { passwordHash, refreshTokenHash, twoFactorSecret, ...safeObj } = obj;
    return safeObj;
  }
}
