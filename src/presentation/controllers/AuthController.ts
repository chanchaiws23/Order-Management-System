import { Request, Response, NextFunction } from 'express';
import { AuthUseCases } from '../../application/use-cases/AuthUseCases';
import { AuthenticatedRequest } from '../middleware/AuthMiddleware';
import { SecurityRequest } from '../middleware/SecurityMiddleware';
import { LogExecutionTime } from '../decorators/LogExecutionTime';

export class AuthController {
  constructor(private readonly authUseCases: AuthUseCases) {}

  register = LogExecutionTime()(
    async (req: SecurityRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { email, password, firstName, lastName } = req.body;
        const ipAddress = req.clientIp || req.ip || 'unknown';

        const user = await this.authUseCases.register(
          { email, password, firstName, lastName },
          ipAddress
        );

        res.status(201).json({
          success: true,
          data: user.toSafeObject(),
          message: 'Registration successful',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  login = LogExecutionTime()(
    async (req: SecurityRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { email, password } = req.body;
        const ipAddress = req.clientIp || req.ip || 'unknown';
        const userAgent = req.headers['user-agent'];

        const result = await this.authUseCases.login({
          email,
          password,
          ipAddress,
          userAgent,
        });

        res.json({
          success: true,
          data: {
            user: result.user,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        res.status(401).json({ success: false, error: message });
      }
    }
  );

  logout = LogExecutionTime()(
    async (req: AuthenticatedRequest & SecurityRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const userId = req.userId;
        const ipAddress = req.clientIp || req.ip || 'unknown';

        if (userId) {
          await this.authUseCases.logout(userId, ipAddress);
        }

        res.json({ success: true, message: 'Logged out successfully' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Logout failed';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  refreshToken = LogExecutionTime()(
    async (req: SecurityRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const { refreshToken } = req.body;
        const ipAddress = req.clientIp || req.ip || 'unknown';

        if (!refreshToken) {
          res.status(400).json({ success: false, error: 'Refresh token is required' });
          return;
        }

        const tokens = await this.authUseCases.refreshTokens(refreshToken, ipAddress);

        res.json({
          success: true,
          data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Token refresh failed';
        res.status(401).json({ success: false, error: message });
      }
    }
  );

  changePassword = LogExecutionTime()(
    async (req: AuthenticatedRequest & SecurityRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const userId = req.userId;
        const { currentPassword, newPassword } = req.body;
        const ipAddress = req.clientIp || req.ip || 'unknown';

        if (!userId) {
          res.status(401).json({ success: false, error: 'Not authenticated' });
          return;
        }

        await this.authUseCases.changePassword({
          userId,
          currentPassword,
          newPassword,
          ipAddress,
        });

        res.json({ success: true, message: 'Password changed successfully' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Password change failed';
        res.status(400).json({ success: false, error: message });
      }
    }
  );

  getProfile = LogExecutionTime()(
    async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const userId = req.userId;
        if (!userId) {
          res.status(401).json({ success: false, error: 'Not authenticated' });
          return;
        }

        const user = await this.authUseCases.getUserById(userId);
        if (!user) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }

        res.json({ success: true, data: user.toSafeObject() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get profile';
        res.status(500).json({ success: false, error: message });
      }
    }
  );
}
