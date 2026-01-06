import { AuditLog, AuditAction, AuditSeverity } from '../../../src/domain/entities/AuditLog';
import { IAuditLogRepository, AuditLogSearchCriteria } from '../../../src/domain/repositories/IAuditLogRepository';
import { PaginationOptions, PaginatedResult } from '../../../src/domain/repositories/IOrderRepository';

export class MockAuditLogRepository implements IAuditLogRepository {
  private logs: Map<string, AuditLog> = new Map();

  async save(auditLog: AuditLog): Promise<void> {
    this.logs.set(auditLog.id, auditLog);
  }

  async findById(id: string): Promise<AuditLog | null> {
    return this.logs.get(id) || null;
  }

  async findByUserId(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    const filtered = Array.from(this.logs.values()).filter(log => log.userId === userId);
    return this.paginate(filtered, pagination);
  }

  async findByAction(action: AuditAction, pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    const filtered = Array.from(this.logs.values()).filter(log => log.action === action);
    return this.paginate(filtered, pagination);
  }

  async search(criteria: AuditLogSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    let filtered = Array.from(this.logs.values());

    if (criteria.userId) {
      filtered = filtered.filter(log => log.userId === criteria.userId);
    }
    if (criteria.action) {
      filtered = filtered.filter(log => log.action === criteria.action);
    }
    if (criteria.severity) {
      filtered = filtered.filter(log => log.severity === criteria.severity);
    }
    if (criteria.success !== undefined) {
      filtered = filtered.filter(log => log.success === criteria.success);
    }
    if (criteria.ipAddress) {
      filtered = filtered.filter(log => log.ipAddress === criteria.ipAddress);
    }

    return this.paginate(filtered, pagination);
  }

  async findSuspiciousActivity(pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    const filtered = Array.from(this.logs.values()).filter(
      log => log.action === 'SUSPICIOUS_ACTIVITY' || log.severity === 'CRITICAL'
    );
    return this.paginate(filtered, pagination);
  }

  async findFailedLogins(since: Date, pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    const filtered = Array.from(this.logs.values()).filter(
      log => log.action === 'LOGIN_FAILED' && log.createdAt >= since
    );
    return this.paginate(filtered, pagination);
  }

  async countByActionSince(action: AuditAction, since: Date): Promise<number> {
    return Array.from(this.logs.values()).filter(
      log => log.action === action && log.createdAt >= since
    ).length;
  }

  async deleteOlderThan(date: Date): Promise<number> {
    let deleted = 0;
    for (const [id, log] of this.logs.entries()) {
      if (log.createdAt < date) {
        this.logs.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  private paginate(data: AuditLog[], pagination?: PaginationOptions): PaginatedResult<AuditLog> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const start = (page - 1) * limit;
    const paginatedData = data.slice(start, start + limit);

    return {
      data: paginatedData,
      total: data.length,
      page,
      limit,
      totalPages: Math.ceil(data.length / limit),
    };
  }

  // Test helper methods
  clear(): void {
    this.logs.clear();
  }

  getAll(): AuditLog[] {
    return Array.from(this.logs.values());
  }
}
