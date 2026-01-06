import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthUseCases } from '../../application/use-cases/AuthUseCases';
import { createAuthMiddleware } from '../middleware/AuthMiddleware';
import { createRateLimitMiddleware } from '../middleware/SecurityMiddleware';
import { IRateLimiter, rateLimitConfigs } from '../../infrastructure/security/RateLimiter';

export function createAuthRoutes(
  authController: AuthController,
  authUseCases: AuthUseCases,
  rateLimiter: IRateLimiter
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authUseCases);

  // Public routes with rate limiting
  router.post(
    '/register',
    createRateLimitMiddleware(rateLimiter, rateLimitConfigs.register),
    authController.register
  );

  router.post(
    '/login',
    createRateLimitMiddleware(rateLimiter, rateLimitConfigs.login),
    authController.login
  );

  router.post(
    '/refresh-token',
    createRateLimitMiddleware(rateLimiter, rateLimitConfigs.api),
    authController.refreshToken
  );

  // Protected routes
  router.post('/logout', authMiddleware, authController.logout);
  router.post('/change-password', authMiddleware, authController.changePassword);
  router.get('/profile', authMiddleware, authController.getProfile);

  return router;
}
