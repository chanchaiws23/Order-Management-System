import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';

// Infrastructure - Security
import { PasswordHasher } from '../../../src/infrastructure/security/PasswordHasher';
import { JwtService } from '../../../src/infrastructure/security/JwtService';
import { RateLimiter } from '../../../src/infrastructure/security/RateLimiter';
import { InputValidator } from '../../../src/infrastructure/security/InputValidator';

// Application - Use Cases
import { AuthUseCases } from '../../../src/application/use-cases/AuthUseCases';

// Presentation
import { AuthController } from '../../../src/presentation/controllers/AuthController';
import { createAuthRoutes } from '../../../src/presentation/routes/authRoutes';
import { createAuthMiddleware } from '../../../src/presentation/middleware/AuthMiddleware';
import {
  requestIdMiddleware,
  clientIpMiddleware,
  createRateLimitMiddleware,
  createInputSanitizationMiddleware,
} from '../../../src/presentation/middleware/SecurityMiddleware';

// Shared
import { UuidGenerator } from '../../../src/shared/utils/generateId';

// Mock Repositories
import { MockUserRepository } from '../mocks/MockUserRepository';
import { MockAuditLogRepository } from '../mocks/MockAuditLogRepository';

export interface TestAppContext {
  app: Application;
  userRepository: MockUserRepository;
  auditLogRepository: MockAuditLogRepository;
  authUseCases: AuthUseCases;
  jwtService: JwtService;
  passwordHasher: PasswordHasher;
  rateLimiter: RateLimiter;
}

export function createTestApp(): TestAppContext {
  // Create mock repositories
  const userRepository = new MockUserRepository();
  const auditLogRepository = new MockAuditLogRepository();

  // Create real security services
  const passwordHasher = new PasswordHasher();
  const jwtService = new JwtService({
    accessSecret: 'test-access-secret-key-32-chars!',
    refreshSecret: 'test-refresh-secret-key-32-chars',
    accessExpiresInMinutes: 15,
    refreshExpiresInDays: 7,
  });
  const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 100 });
  const inputValidator = new InputValidator();

  // Create use cases with mock repositories
  const idGenerator = new UuidGenerator();
  const authUseCases = new AuthUseCases(
    userRepository,
    auditLogRepository,
    passwordHasher,
    jwtService,
    idGenerator
  );

  // Create controllers
  const authController = new AuthController(authUseCases);

  // Create Express app
  const app: Application = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(requestIdMiddleware());
  app.use(clientIpMiddleware());
  app.use(createInputSanitizationMiddleware(inputValidator));
  app.use(createRateLimitMiddleware(rateLimiter));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes
  const authRoutes = createAuthRoutes(authController, authUseCases, rateLimiter);
  app.use('/api/auth', authRoutes);

  // Protected test route
  const authMiddleware = createAuthMiddleware(authUseCases);
  app.get('/api/protected', authMiddleware, (req: Request, res: Response) => {
    res.json({ success: true, user: (req as any).user });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[TEST ERROR]', err.message);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message,
    });
  });

  return {
    app,
    userRepository,
    auditLogRepository,
    authUseCases,
    jwtService,
    passwordHasher,
    rateLimiter,
  };
}
