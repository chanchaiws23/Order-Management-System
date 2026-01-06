import { Request, Response, NextFunction } from 'express';
import { AuthUseCases } from '../../application/use-cases/AuthUseCases';
import { Role, hasPermission, hasMinimumRole } from '../../domain/value-objects/Role';
import { TokenPayload } from '../../infrastructure/security/JwtService';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  userId?: string;
}

export function createAuthMiddleware(authUseCases: AuthUseCases) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'No token provided' });
        return;
      }

      const token = authHeader.substring(7);
      const payload = await authUseCases.verifyToken(token);

      if (!payload) {
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
        return;
      }

      const user = await authUseCases.getUserById(payload.userId);
      if (!user || !user.canLogin) {
        res.status(401).json({ success: false, error: 'User account is not active' });
        return;
      }

      req.user = payload;
      req.userId = payload.userId;
      next();
    } catch (error) {
      res.status(401).json({ success: false, error: 'Authentication failed' });
    }
  };
}

export function createRoleMiddleware(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const userRole = req.user.role as Role;
    if (!allowedRoles.includes(userRole) && userRole !== Role.SUPER_ADMIN) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function createPermissionMiddleware(requiredPermission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const userRole = req.user.role as Role;
    if (!hasPermission(userRole, requiredPermission)) {
      res.status(403).json({ success: false, error: 'Permission denied' });
      return;
    }

    next();
  };
}

export function createMinimumRoleMiddleware(minimumRole: Role) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const userRole = req.user.role as Role;
    if (!hasMinimumRole(userRole, minimumRole)) {
      res.status(403).json({ success: false, error: 'Insufficient role level' });
      return;
    }

    next();
  };
}

export function createOwnershipMiddleware(
  getResourceOwnerId: (req: Request) => Promise<string | null>
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const userRole = req.user.role as Role;
    if (userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN) {
      next();
      return;
    }

    try {
      const ownerId = await getResourceOwnerId(req);
      if (ownerId && ownerId === req.user.userId) {
        next();
        return;
      }

      res.status(403).json({ success: false, error: 'Access denied to this resource' });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to verify ownership' });
    }
  };
}

export function optionalAuth(authUseCases: AuthUseCases) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = await authUseCases.verifyToken(token);
        if (payload) {
          req.user = payload;
          req.userId = payload.userId;
        }
      }
    } catch {
      // Ignore errors for optional auth
    }
    next();
  };
}
