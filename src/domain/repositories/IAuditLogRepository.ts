import { AuditLog, AuditAction, AuditSeverity } from '../entities/AuditLog';
import { PaginationOptions, PaginatedResult } from './IOrderRepository';

export interface AuditLogSearchCriteria {
  userId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  resource?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
}

export interface IAuditLogRepository {
  save(auditLog: AuditLog): Promise<void>;
  findById(id: string): Promise<AuditLog | null>;
  findByUserId(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>>;
  findByAction(action: AuditAction, pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>>;
  search(criteria: AuditLogSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>>;
  findSuspiciousActivity(pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>>;
  findFailedLogins(since: Date, pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>>;
  countByActionSince(action: AuditAction, since: Date): Promise<number>;
  deleteOlderThan(date: Date): Promise<number>;
}
