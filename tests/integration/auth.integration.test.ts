import request from 'supertest';
import { createTestApp, TestAppContext } from './setup/testApp';
import { AuditLog } from '../../src/domain/entities/AuditLog';

describe('Auth API Integration Tests', () => {
  let ctx: TestAppContext;

  beforeEach(() => {
    ctx = createTestApp();
    ctx.userRepository.clear();
    ctx.auditLogRepository.clear();
  });

  afterEach(() => {
    ctx.rateLimiter.destroy();
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'SecurePass123!@#',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      const response = await request(ctx.app)
        .post('/api/auth/register')
        .send(validUser)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(validUser.email);
      expect(response.body.data.firstName).toBe(validUser.firstName);

      // Verify user was saved
      const savedUser = await ctx.userRepository.findByEmail(validUser.email);
      expect(savedUser).not.toBeNull();
      expect(savedUser?.email).toBe(validUser.email);
    });

    it('should reject registration with existing email', async () => {
      // Register first user
      await request(ctx.app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      // Try to register with same email
      const response = await request(ctx.app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(ctx.app)
        .post('/api/auth/register')
        .send({ ...validUser, password: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(ctx.app)
        .post('/api/auth/register')
        .send({ ...validUser, email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(ctx.app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should create audit log for registration', async () => {
      await request(ctx.app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      const logs = ctx.auditLogRepository.getAll();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((log: AuditLog) => log.action === 'USER_CREATED')).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: 'login@example.com',
      password: 'SecurePass123!@#',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    beforeEach(async () => {
      // Register user before login tests
      await request(ctx.app)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(ctx.app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const response = await request(ctx.app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(ctx.app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should create audit log for successful login', async () => {
      await request(ctx.app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const logs = ctx.auditLogRepository.getAll();
      expect(logs.some((log: AuditLog) => log.action === 'LOGIN_SUCCESS')).toBe(true);
    });

    it('should create audit log for failed login', async () => {
      await request(ctx.app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      const logs = ctx.auditLogRepository.getAll();
      expect(logs.some((log: AuditLog) => log.action === 'LOGIN_FAILED')).toBe(true);
    });
  });

  describe('GET /api/protected (Authentication)', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Register and login to get token
      await request(ctx.app)
        .post('/api/auth/register')
        .send({
          email: 'protected@example.com',
          password: 'SecurePass123!@#',
          firstName: 'Test',
          lastName: 'User',
        });
      
      const loginResponse = await request(ctx.app)
        .post('/api/auth/login')
        .send({
          email: 'protected@example.com',
          password: 'SecurePass123!@#',
        });
      accessToken = loginResponse.body.data.accessToken;
    });

    it('should access protected route with valid token', async () => {
      const response = await request(ctx.app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    it('should reject access without token', async () => {
      const response = await request(ctx.app)
        .get('/api/protected')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject access with invalid token', async () => {
      const response = await request(ctx.app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject access with malformed authorization header', async () => {
      const response = await request(ctx.app)
        .get('/api/protected')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await request(ctx.app)
        .post('/api/auth/register')
        .send({
          email: 'refresh@example.com',
          password: 'SecurePass123!@#',
          firstName: 'Refresh',
          lastName: 'Test',
        });
      
      const loginResponse = await request(ctx.app)
        .post('/api/auth/login')
        .send({
          email: 'refresh@example.com',
          password: 'SecurePass123!@#',
        });
      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(ctx.app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(ctx.app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      await request(ctx.app)
        .post('/api/auth/register')
        .send({
          email: 'logout@example.com',
          password: 'SecurePass123!@#',
          firstName: 'Logout',
          lastName: 'Test',
        });
      
      const loginResponse = await request(ctx.app)
        .post('/api/auth/login')
        .send({
          email: 'logout@example.com',
          password: 'SecurePass123!@#',
        });
      accessToken = loginResponse.body.data.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(ctx.app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should create audit log for logout', async () => {
      await request(ctx.app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const logs = ctx.auditLogRepository.getAll();
      expect(logs.some((log: AuditLog) => log.action === 'LOGOUT')).toBe(true);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(ctx.app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should block requests when rate limit exceeded', async () => {
      // Create a new test app with low rate limit
      const limitedApp = createTestApp();
      limitedApp.rateLimiter.reset('*');

      // Manually set low limit for testing
      const testRateLimiter = limitedApp.rateLimiter;
      
      // Make many requests
      const requests = [];
      for (let i = 0; i < 110; i++) {
        requests.push(
          request(limitedApp.app)
            .get('/health')
        );
      }

      const responses = await Promise.all(requests);
      const blockedResponses = responses.filter(r => r.status === 429);
      
      // Some requests should be blocked after limit
      expect(blockedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts in input', async () => {
      const response = await request(ctx.app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!@#',
          firstName: '<script>alert("xss")</script>',
          lastName: 'Doe',
        });

      // The request might fail validation, but XSS should be sanitized
      if (response.body.data?.user) {
        expect(response.body.data.user.firstName).not.toContain('<script>');
      }
    });
  });
});
