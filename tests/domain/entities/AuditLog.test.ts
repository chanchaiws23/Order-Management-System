import { AuditLog } from '../../../src/domain/entities/AuditLog';

describe('AuditLog Entity', () => {
  const validProps = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    userEmail: 'test@example.com',
    action: 'LOGIN_SUCCESS' as const,
    description: 'User logged in successfully',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    requestId: 'req-123',
    success: true,
  };

  describe('create', () => {
    it('should create audit log with valid props', () => {
      const auditLog = AuditLog.create(validProps);

      expect(auditLog.id).toBe(validProps.id);
      expect(auditLog.userId).toBe(validProps.userId);
      expect(auditLog.userEmail).toBe(validProps.userEmail);
      expect(auditLog.action).toBe('LOGIN_SUCCESS');
      expect(auditLog.description).toBe(validProps.description);
      expect(auditLog.ipAddress).toBe(validProps.ipAddress);
      expect(auditLog.success).toBe(true);
      expect(auditLog.severity).toBe('INFO');
      expect(auditLog.createdAt).toBeInstanceOf(Date);
    });

    it('should create audit log with custom severity', () => {
      const auditLog = AuditLog.create({
        ...validProps,
        severity: 'WARNING',
      });

      expect(auditLog.severity).toBe('WARNING');
    });

    it('should create audit log for failed action', () => {
      const auditLog = AuditLog.create({
        ...validProps,
        action: 'LOGIN_FAILED',
        success: false,
        errorMessage: 'Invalid credentials',
        severity: 'WARNING',
      });

      expect(auditLog.success).toBe(false);
      expect(auditLog.errorMessage).toBe('Invalid credentials');
      expect(auditLog.action).toBe('LOGIN_FAILED');
    });

    it('should create audit log with resource info', () => {
      const auditLog = AuditLog.create({
        ...validProps,
        action: 'ORDER_CREATED',
        resource: 'Order',
        resourceId: 'order-456',
      });

      expect(auditLog.resource).toBe('Order');
      expect(auditLog.resourceId).toBe('order-456');
    });

    it('should create audit log with metadata', () => {
      const metadata = { browser: 'Chrome', os: 'Windows' };
      const auditLog = AuditLog.create({
        ...validProps,
        metadata,
      });

      expect(auditLog.metadata).toEqual(metadata);
    });

    it('should create critical security audit log', () => {
      const auditLog = AuditLog.create({
        ...validProps,
        action: 'SUSPICIOUS_ACTIVITY',
        severity: 'CRITICAL',
        description: 'Multiple failed login attempts detected',
        success: false,
      });

      expect(auditLog.severity).toBe('CRITICAL');
      expect(auditLog.action).toBe('SUSPICIOUS_ACTIVITY');
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute audit log from props', () => {
      const createdAt = new Date('2024-01-01');
      const auditLog = AuditLog.reconstitute({
        ...validProps,
        severity: 'INFO',
        createdAt,
      });

      expect(auditLog.id).toBe(validProps.id);
      expect(auditLog.createdAt).toBe(createdAt);
    });
  });

  describe('toObject', () => {
    it('should convert to plain object', () => {
      const auditLog = AuditLog.create(validProps);
      const obj = auditLog.toObject();

      expect(obj.id).toBe(validProps.id);
      expect(obj.userId).toBe(validProps.userId);
      expect(obj.action).toBe('LOGIN_SUCCESS');
      expect(obj.severity).toBe('INFO');
      expect(obj.success).toBe(true);
    });
  });

  describe('getters', () => {
    it('should return all properties correctly', () => {
      const auditLog = AuditLog.create({
        ...validProps,
        resource: 'User',
        resourceId: 'user-456',
        metadata: { key: 'value' },
      });

      expect(auditLog.id).toBeDefined();
      expect(auditLog.userId).toBe('user-123');
      expect(auditLog.userEmail).toBe('test@example.com');
      expect(auditLog.action).toBe('LOGIN_SUCCESS');
      expect(auditLog.severity).toBe('INFO');
      expect(auditLog.resource).toBe('User');
      expect(auditLog.resourceId).toBe('user-456');
      expect(auditLog.description).toBeDefined();
      expect(auditLog.metadata).toEqual({ key: 'value' });
      expect(auditLog.ipAddress).toBe('192.168.1.1');
      expect(auditLog.userAgent).toBe('Mozilla/5.0');
      expect(auditLog.requestId).toBe('req-123');
      expect(auditLog.success).toBe(true);
      expect(auditLog.errorMessage).toBeUndefined();
      expect(auditLog.createdAt).toBeInstanceOf(Date);
    });
  });
});
