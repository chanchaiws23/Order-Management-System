import { 
  Role, 
  RoleHierarchy, 
  RolePermissions, 
  hasPermission, 
  hasMinimumRole 
} from '../../../src/domain/value-objects/Role';

describe('Role Value Object', () => {
  describe('Role enum', () => {
    it('should have correct role values', () => {
      expect(Role.SUPER_ADMIN).toBe('SUPER_ADMIN');
      expect(Role.ADMIN).toBe('ADMIN');
      expect(Role.MANAGER).toBe('MANAGER');
      expect(Role.STAFF).toBe('STAFF');
      expect(Role.CUSTOMER).toBe('CUSTOMER');
    });
  });

  describe('RoleHierarchy', () => {
    it('should have SUPER_ADMIN as highest', () => {
      expect(RoleHierarchy[Role.SUPER_ADMIN]).toBe(100);
    });

    it('should have correct hierarchy order', () => {
      expect(RoleHierarchy[Role.SUPER_ADMIN]).toBeGreaterThan(RoleHierarchy[Role.ADMIN]);
      expect(RoleHierarchy[Role.ADMIN]).toBeGreaterThan(RoleHierarchy[Role.MANAGER]);
      expect(RoleHierarchy[Role.MANAGER]).toBeGreaterThan(RoleHierarchy[Role.STAFF]);
      expect(RoleHierarchy[Role.STAFF]).toBeGreaterThan(RoleHierarchy[Role.CUSTOMER]);
    });
  });

  describe('RolePermissions', () => {
    it('should give SUPER_ADMIN all permissions', () => {
      expect(RolePermissions[Role.SUPER_ADMIN]).toContain('*');
    });

    it('should give ADMIN user management permissions', () => {
      const adminPerms = RolePermissions[Role.ADMIN];
      expect(adminPerms).toContain('users:read');
      expect(adminPerms).toContain('users:write');
      expect(adminPerms).toContain('users:delete');
    });

    it('should give MANAGER limited permissions', () => {
      const managerPerms = RolePermissions[Role.MANAGER];
      expect(managerPerms).toContain('products:read');
      expect(managerPerms).toContain('products:write');
      expect(managerPerms).not.toContain('users:delete');
    });

    it('should give STAFF read-heavy permissions', () => {
      const staffPerms = RolePermissions[Role.STAFF];
      expect(staffPerms).toContain('products:read');
      expect(staffPerms).toContain('orders:read');
      expect(staffPerms).not.toContain('products:write');
    });

    it('should give CUSTOMER only own resource permissions', () => {
      const customerPerms = RolePermissions[Role.CUSTOMER];
      expect(customerPerms).toContain('orders:own:read');
      expect(customerPerms).toContain('profile:own:write');
      expect(customerPerms).not.toContain('users:read');
    });
  });

  describe('hasPermission', () => {
    it('should return true for SUPER_ADMIN on any permission', () => {
      expect(hasPermission(Role.SUPER_ADMIN, 'users:delete')).toBe(true);
      expect(hasPermission(Role.SUPER_ADMIN, 'anything:random')).toBe(true);
    });

    it('should return true for exact permission match', () => {
      expect(hasPermission(Role.ADMIN, 'users:read')).toBe(true);
      expect(hasPermission(Role.MANAGER, 'products:write')).toBe(true);
    });

    it('should return false for missing permission', () => {
      expect(hasPermission(Role.STAFF, 'users:delete')).toBe(false);
      expect(hasPermission(Role.CUSTOMER, 'products:write')).toBe(false);
    });

    it('should handle resource wildcard permissions', () => {
      expect(hasPermission(Role.SUPER_ADMIN, 'orders:read')).toBe(true);
    });
  });

  describe('hasMinimumRole', () => {
    it('should return true when user role equals required role', () => {
      expect(hasMinimumRole(Role.ADMIN, Role.ADMIN)).toBe(true);
      expect(hasMinimumRole(Role.MANAGER, Role.MANAGER)).toBe(true);
    });

    it('should return true when user role is higher', () => {
      expect(hasMinimumRole(Role.SUPER_ADMIN, Role.ADMIN)).toBe(true);
      expect(hasMinimumRole(Role.ADMIN, Role.MANAGER)).toBe(true);
      expect(hasMinimumRole(Role.MANAGER, Role.STAFF)).toBe(true);
    });

    it('should return false when user role is lower', () => {
      expect(hasMinimumRole(Role.STAFF, Role.MANAGER)).toBe(false);
      expect(hasMinimumRole(Role.CUSTOMER, Role.STAFF)).toBe(false);
      expect(hasMinimumRole(Role.MANAGER, Role.ADMIN)).toBe(false);
    });

    it('should allow SUPER_ADMIN access to everything', () => {
      expect(hasMinimumRole(Role.SUPER_ADMIN, Role.CUSTOMER)).toBe(true);
      expect(hasMinimumRole(Role.SUPER_ADMIN, Role.SUPER_ADMIN)).toBe(true);
    });
  });
});
