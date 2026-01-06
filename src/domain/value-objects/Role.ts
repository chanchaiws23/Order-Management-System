export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export const RoleHierarchy: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.ADMIN]: 80,
  [Role.MANAGER]: 60,
  [Role.STAFF]: 40,
  [Role.CUSTOMER]: 20,
};

export const RolePermissions: Record<Role, string[]> = {
  [Role.SUPER_ADMIN]: ['*'],
  [Role.ADMIN]: [
    'users:read', 'users:write', 'users:delete',
    'products:read', 'products:write', 'products:delete',
    'orders:read', 'orders:write', 'orders:delete',
    'customers:read', 'customers:write', 'customers:delete',
    'coupons:read', 'coupons:write', 'coupons:delete',
    'reviews:read', 'reviews:write', 'reviews:delete',
    'payments:read', 'payments:write', 'payments:refund',
    'reports:read', 'settings:read', 'settings:write',
  ],
  [Role.MANAGER]: [
    'products:read', 'products:write',
    'orders:read', 'orders:write',
    'customers:read',
    'coupons:read', 'coupons:write',
    'reviews:read', 'reviews:write',
    'payments:read',
    'reports:read',
  ],
  [Role.STAFF]: [
    'products:read',
    'orders:read', 'orders:write',
    'customers:read',
    'reviews:read',
    'payments:read',
  ],
  [Role.CUSTOMER]: [
    'orders:own:read', 'orders:own:write',
    'reviews:own:read', 'reviews:own:write',
    'profile:own:read', 'profile:own:write',
  ],
};

export function hasPermission(role: Role, permission: string): boolean {
  const permissions = RolePermissions[role];
  if (permissions.includes('*')) return true;
  if (permissions.includes(permission)) return true;
  
  const [resource, action] = permission.split(':');
  if (permissions.includes(`${resource}:*`)) return true;
  
  return false;
}

export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return RoleHierarchy[userRole] >= RoleHierarchy[requiredRole];
}
