import { Request, Response, NextFunction } from 'express';
import { UserUseCases } from '../../application/use-cases/UserUseCases';
import { AuthenticatedRequest } from '../middleware/AuthMiddleware';
import { SecurityRequest } from '../middleware/SecurityMiddleware';
import { LogExecutionTime } from '../decorators/LogExecutionTime';
import { Role } from '../../domain/value-objects/Role';

export class UserController {
  constructor(private readonly userUseCases: UserUseCases) {}

  getAllUsers = LogExecutionTime()(
    async (req: AuthenticatedRequest & SecurityRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await this.userUseCases.getAllUsers(
          { page, limit },
          req.userId
        );

        const users = result.data.map(user => user.toSafeObject());

        res.json({
          success: true,
          data: users,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get users';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  getUserById = LogExecutionTime()(
    async (req: AuthenticatedRequest & SecurityRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { id } = req.params;

        const user = await this.userUseCases.getUserById(id, req.userId);
        if (!user) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }

        res.json({
          success: true,
          data: user.toSafeObject(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get user';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  searchUsers = LogExecutionTime()(
    async (req: AuthenticatedRequest & SecurityRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { email, name, role, isActive, isEmailVerified } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const criteria: any = {};
        if (email) criteria.email = email as string;
        if (name) criteria.name = name as string;
        if (role) criteria.role = role as Role;
        if (isActive !== undefined) criteria.isActive = isActive === 'true';
        if (isEmailVerified !== undefined) criteria.isEmailVerified = isEmailVerified === 'true';

        const result = await this.userUseCases.searchUsers(
          criteria,
          { page, limit },
          req.userId
        );

        const users = result.data.map(user => user.toSafeObject());

        res.json({
          success: true,
          data: users,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to search users';
        res.status(500).json({ success: false, error: message });
      }
    }
  );

  createUser = LogExecutionTime()(
    async (req: AuthenticatedRequest & SecurityRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { email, password, firstName, lastName, role } = req.body;
        const ipAddress = req.clientIp || req.ip || 'unknown';
        const adminUserId = req.userId!;

        if (!email || !password || !firstName || !lastName || !role) {
          res.status(400).json({
            success: false,
            error: 'Missing required fields: email, password, firstName, lastName, role',
          });
          return;
        }

        const validRoles = Object.values(Role);
        if (!validRoles.includes(role)) {
          res.status(400).json({
            success: false,
            error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          });
          return;
        }

        const user = await this.userUseCases.createUser(
          { email, password, firstName, lastName, role },
          ipAddress,
          adminUserId
        );

        res.status(201).json({
          success: true,
          data: user.toSafeObject(),
          message: 'User created successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create user';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  updateUser = LogExecutionTime()(
    async (req: AuthenticatedRequest & SecurityRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { id } = req.params;
        const { firstName, lastName, role, isActive } = req.body;
        const ipAddress = req.clientIp || req.ip || 'unknown';
        const adminUserId = req.userId!;

        const updateData: any = {};
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (role !== undefined) {
          const validRoles = Object.values(Role);
          if (!validRoles.includes(role)) {
            res.status(400).json({
              success: false,
              error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
            });
            return;
          }
          updateData.role = role;
        }
        if (isActive !== undefined) updateData.isActive = isActive;

        const user = await this.userUseCases.updateUser(
          id,
          updateData,
          ipAddress,
          adminUserId
        );

        res.json({
          success: true,
          data: user.toSafeObject(),
          message: 'User updated successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update user';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  deleteUser = LogExecutionTime()(
    async (req: AuthenticatedRequest & SecurityRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { id } = req.params;
        const ipAddress = req.clientIp || req.ip || 'unknown';
        const adminUserId = req.userId!;

        await this.userUseCases.deleteUser(id, ipAddress, adminUserId);

        res.json({
          success: true,
          message: 'User deleted successfully',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete user';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getUserStats = LogExecutionTime()(
    async (_req: AuthenticatedRequest & SecurityRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const stats = await this.userUseCases.getUserStats();

        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get user stats';
        res.status(500).json({ success: false, error: message });
      }
    }
  );
}
