import { AuditLog, AuditLogProps, AuditAction, AuditSeverity } from '../../domain/entities/AuditLog';
import { IAuditLogRepository, AuditLogSearchCriteria } from '../../domain/repositories/IAuditLogRepository';
import { PaginationOptions, PaginatedResult } from '../../domain/repositories/IOrderRepository';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  severity: string;
  resource: string | null;
  resource_id: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string | null;
  request_id: string | null;
  success: boolean;
  error_message: string | null;
  created_at: Date;
}

export class PostgresAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async save(auditLog: AuditLog): Promise<void> {
    const p = auditLog.toObject();
    await this.db.query(
      `INSERT INTO audit_logs (id, user_id, user_email, action, severity, resource, resource_id, 
        description, metadata, ip_address, user_agent, request_id, success, error_message, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [p.id, p.userId || null, p.userEmail || null, p.action, p.severity, p.resource || null,
       p.resourceId || null, p.description, p.metadata ? JSON.stringify(p.metadata) : null,
       p.ipAddress, p.userAgent || null, p.requestId || null, p.success, p.errorMessage || null, p.createdAt]
    );
  }

  async findById(id: string): Promise<AuditLog | null> {
    const result = await this.db.query<AuditLogRow>('SELECT * FROM audit_logs WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.toDomain(result.rows[0]) : null;
  }

  async findByUserId(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM audit_logs WHERE user_id = $1', [userId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<AuditLogRow>(
      'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [userId, limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByAction(action: AuditAction, pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM audit_logs WHERE action = $1', [action]);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<AuditLogRow>(
      'SELECT * FROM audit_logs WHERE action = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [action, limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async search(criteria: AuditLogSearchCriteria, pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (criteria.userId) { conditions.push(`user_id = $${idx++}`); params.push(criteria.userId); }
    if (criteria.action) { conditions.push(`action = $${idx++}`); params.push(criteria.action); }
    if (criteria.severity) { conditions.push(`severity = $${idx++}`); params.push(criteria.severity); }
    if (criteria.resource) { conditions.push(`resource = $${idx++}`); params.push(criteria.resource); }
    if (criteria.success !== undefined) { conditions.push(`success = $${idx++}`); params.push(criteria.success); }
    if (criteria.startDate) { conditions.push(`created_at >= $${idx++}`); params.push(criteria.startDate); }
    if (criteria.endDate) { conditions.push(`created_at <= $${idx++}`); params.push(criteria.endDate); }
    if (criteria.ipAddress) { conditions.push(`ip_address = $${idx++}`); params.push(criteria.ipAddress); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.db.query<{ count: string }>(`SELECT COUNT(*) FROM audit_logs ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const result = await this.db.query<AuditLogRow>(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findSuspiciousActivity(pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) FROM audit_logs WHERE severity IN ('WARNING', 'ERROR', 'CRITICAL') OR action = 'SUSPICIOUS_ACTIVITY'`
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<AuditLogRow>(
      `SELECT * FROM audit_logs WHERE severity IN ('WARNING', 'ERROR', 'CRITICAL') OR action = 'SUSPICIOUS_ACTIVITY'
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findFailedLogins(since: Date, pagination?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) FROM audit_logs WHERE action = 'LOGIN_FAILED' AND created_at >= $1`, [since]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query<AuditLogRow>(
      `SELECT * FROM audit_logs WHERE action = 'LOGIN_FAILED' AND created_at >= $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [since, limit, offset]
    );

    return { data: result.rows.map(row => this.toDomain(row)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async countByActionSince(action: AuditAction, since: Date): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) FROM audit_logs WHERE action = $1 AND created_at >= $2', [action, since]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.db.query<{ count: string }>('DELETE FROM audit_logs WHERE created_at < $1', [date]);
    return result.rowCount ?? 0;
  }

  private toDomain(row: AuditLogRow): AuditLog {
    const props: AuditLogProps = {
      id: row.id, userId: row.user_id ?? undefined, userEmail: row.user_email ?? undefined,
      action: row.action as AuditAction, severity: row.severity as AuditSeverity,
      resource: row.resource ?? undefined, resourceId: row.resource_id ?? undefined,
      description: row.description, metadata: row.metadata ?? undefined,
      ipAddress: row.ip_address, userAgent: row.user_agent ?? undefined,
      requestId: row.request_id ?? undefined, success: row.success,
      errorMessage: row.error_message ?? undefined, createdAt: new Date(row.created_at),
    };
    return AuditLog.reconstitute(props);
  }
}
