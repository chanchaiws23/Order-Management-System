export type AuditAction = 
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT'
  | 'PASSWORD_CHANGE' | 'PASSWORD_RESET'
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'USER_LOCKED'
  | 'ROLE_CHANGED' | '2FA_ENABLED' | '2FA_DISABLED'
  | 'ORDER_CREATED' | 'ORDER_UPDATED' | 'ORDER_CANCELLED'
  | 'PAYMENT_PROCESSED' | 'PAYMENT_REFUNDED'
  | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED'
  | 'COUPON_CREATED' | 'COUPON_USED'
  | 'REVIEW_APPROVED' | 'REVIEW_REJECTED'
  | 'PERMISSION_DENIED' | 'SUSPICIOUS_ACTIVITY'
  | 'DATA_EXPORT' | 'DATA_DELETE';

export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface AuditLogProps {
  id: string;
  userId?: string;
  userEmail?: string;
  action: AuditAction;
  severity: AuditSeverity;
  resource?: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  requestId?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

export interface CreateAuditLogProps {
  id: string;
  userId?: string;
  userEmail?: string;
  action: AuditAction;
  severity?: AuditSeverity;
  resource?: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  requestId?: string;
  success: boolean;
  errorMessage?: string;
}

export class AuditLog {
  private readonly _id: string;
  private readonly _userId?: string;
  private readonly _userEmail?: string;
  private readonly _action: AuditAction;
  private readonly _severity: AuditSeverity;
  private readonly _resource?: string;
  private readonly _resourceId?: string;
  private readonly _description: string;
  private readonly _metadata?: Record<string, unknown>;
  private readonly _ipAddress: string;
  private readonly _userAgent?: string;
  private readonly _requestId?: string;
  private readonly _success: boolean;
  private readonly _errorMessage?: string;
  private readonly _createdAt: Date;

  private constructor(props: AuditLogProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._userEmail = props.userEmail;
    this._action = props.action;
    this._severity = props.severity;
    this._resource = props.resource;
    this._resourceId = props.resourceId;
    this._description = props.description;
    this._metadata = props.metadata;
    this._ipAddress = props.ipAddress;
    this._userAgent = props.userAgent;
    this._requestId = props.requestId;
    this._success = props.success;
    this._errorMessage = props.errorMessage;
    this._createdAt = props.createdAt;
  }

  static create(props: CreateAuditLogProps): AuditLog {
    return new AuditLog({
      ...props,
      severity: props.severity ?? 'INFO',
      createdAt: new Date(),
    });
  }

  static reconstitute(props: AuditLogProps): AuditLog {
    return new AuditLog(props);
  }

  get id(): string { return this._id; }
  get userId(): string | undefined { return this._userId; }
  get userEmail(): string | undefined { return this._userEmail; }
  get action(): AuditAction { return this._action; }
  get severity(): AuditSeverity { return this._severity; }
  get resource(): string | undefined { return this._resource; }
  get resourceId(): string | undefined { return this._resourceId; }
  get description(): string { return this._description; }
  get metadata(): Record<string, unknown> | undefined { return this._metadata; }
  get ipAddress(): string { return this._ipAddress; }
  get userAgent(): string | undefined { return this._userAgent; }
  get requestId(): string | undefined { return this._requestId; }
  get success(): boolean { return this._success; }
  get errorMessage(): string | undefined { return this._errorMessage; }
  get createdAt(): Date { return this._createdAt; }

  toObject(): AuditLogProps {
    return {
      id: this._id,
      userId: this._userId,
      userEmail: this._userEmail,
      action: this._action,
      severity: this._severity,
      resource: this._resource,
      resourceId: this._resourceId,
      description: this._description,
      metadata: this._metadata,
      ipAddress: this._ipAddress,
      userAgent: this._userAgent,
      requestId: this._requestId,
      success: this._success,
      errorMessage: this._errorMessage,
      createdAt: this._createdAt,
    };
  }
}
