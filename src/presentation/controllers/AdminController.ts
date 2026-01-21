import { Request, Response, NextFunction } from 'express';
import { AdminDashboardUseCases } from '../../application/use-cases/AdminDashboardUseCases';
import { LogExecutionTime } from '../decorators/LogExecutionTime';

export class AdminController {
  constructor(private readonly adminDashboardUseCases: AdminDashboardUseCases) {}

  getDashboardStats = LogExecutionTime()(
    async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
      try {
        const stats = await this.adminDashboardUseCases.getDashboardStats();

        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get dashboard stats';
        res.status(500).json({ success: false, error: message });
      }
    }
  );
}
