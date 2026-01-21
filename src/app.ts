import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Infrastructure - Database
import { DatabaseConnection } from './infrastructure/database/DatabaseConnection';

// Infrastructure - Repositories
import { PostgresOrderRepository } from './infrastructure/repositories/PostgresOrderRepository';
import { PostgresCustomerRepository } from './infrastructure/repositories/PostgresCustomerRepository';
import { PostgresAddressRepository } from './infrastructure/repositories/PostgresAddressRepository';
import { PostgresProductRepository } from './infrastructure/repositories/PostgresProductRepository';
import { PostgresCategoryRepository } from './infrastructure/repositories/PostgresCategoryRepository';
import { PostgresCouponRepository } from './infrastructure/repositories/PostgresCouponRepository';
import { PostgresReviewRepository } from './infrastructure/repositories/PostgresReviewRepository';
import { PostgresPaymentRepository } from './infrastructure/repositories/PostgresPaymentRepository';
import { PostgresUserRepository } from './infrastructure/repositories/PostgresUserRepository';
import { PostgresAuditLogRepository } from './infrastructure/repositories/PostgresAuditLogRepository';

// Infrastructure - Adapters & Strategies
import { EmailNotificationAdapter } from './infrastructure/adapters/EmailNotificationAdapter';
import { EventPublisher } from './infrastructure/observers/EventPublisher';
import { OrderNotificationObserver } from './infrastructure/observers/OrderNotificationObserver';
import { PaypalPaymentStrategy } from './infrastructure/strategies/PaypalPaymentStrategy';
import { CreditCardPaymentStrategy } from './infrastructure/strategies/CreditCardPaymentStrategy';

// Infrastructure - Security (OWASP)
import { PasswordHasher } from './infrastructure/security/PasswordHasher';
import { JwtService } from './infrastructure/security/JwtService';
import { RateLimiter } from './infrastructure/security/RateLimiter';
import { InputValidator } from './infrastructure/security/InputValidator';

// Application - Use Cases
import { PaymentFactory } from './application/factories/PaymentFactory';
import { CreateOrderUseCase } from './application/use-cases/CreateOrderUseCase';
import { OrderQueryUseCases } from './application/use-cases/OrderQueryUseCases';
import { OrderManagementUseCases } from './application/use-cases/OrderManagementUseCases';
import { CustomerUseCases } from './application/use-cases/CustomerUseCases';
import { ProductUseCases } from './application/use-cases/ProductUseCases';
import { CouponUseCases } from './application/use-cases/CouponUseCases';
import { ReviewUseCases } from './application/use-cases/ReviewUseCases';
import { PaymentUseCases } from './application/use-cases/PaymentUseCases';
import { AuthUseCases } from './application/use-cases/AuthUseCases';
import { UserUseCases } from './application/use-cases/UserUseCases';
import { AdminDashboardUseCases } from './application/use-cases/AdminDashboardUseCases';

// Presentation - Controllers
import { OrderController } from './presentation/controllers/OrderController';
import { CustomerController } from './presentation/controllers/CustomerController';
import { ProductController } from './presentation/controllers/ProductController';
import { CouponController } from './presentation/controllers/CouponController';
import { ReviewController } from './presentation/controllers/ReviewController';
import { PaymentController } from './presentation/controllers/PaymentController';
import { AuthController } from './presentation/controllers/AuthController';
import { UserController } from './presentation/controllers/UserController';
import { AdminController } from './presentation/controllers/AdminController';
import { createRoutes } from './presentation/routes';
import { createAuthRoutes } from './presentation/routes/authRoutes';

// Presentation - Middleware (Security)
import { createAuthMiddleware, createRoleMiddleware } from './presentation/middleware/AuthMiddleware';
import {
  requestIdMiddleware,
  clientIpMiddleware,
  securityHeadersMiddleware,
  createRateLimitMiddleware,
  createInputSanitizationMiddleware,
} from './presentation/middleware/SecurityMiddleware';

// Shared
import { UuidGenerator } from './shared/utils/generateId';

async function bootstrap(): Promise<Application> {
  console.log('='.repeat(60));
  console.log('🚀 BOOTSTRAPPING ORDER MANAGEMENT SYSTEM');
  console.log('='.repeat(60));

  console.log('\n[1/7] Initializing Database Connection (Singleton)...');
  const dbConnection = DatabaseConnection.getInstance();
  
  // Support DATABASE_URL (Railway, Heroku, etc.) or individual env vars
  const databaseUrl = process.env.DATABASE_URL;
  
  await dbConnection.connect(
    databaseUrl
      ? {
          connectionString: databaseUrl,
          ssl: process.env.NODE_ENV === 'production',
          maxPoolSize: 10,
          minPoolSize: 2,
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          database: process.env.DB_NAME || 'order_management',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          maxPoolSize: 10,
          minPoolSize: 2,
        }
  );

  console.log('\n[2/10] Creating Repositories (Repository Pattern)...');
  const orderRepository = new PostgresOrderRepository(dbConnection);
  const customerRepository = new PostgresCustomerRepository(dbConnection);
  const addressRepository = new PostgresAddressRepository(dbConnection);
  const productRepository = new PostgresProductRepository(dbConnection);
  const categoryRepository = new PostgresCategoryRepository(dbConnection);
  const couponRepository = new PostgresCouponRepository(dbConnection);
  const reviewRepository = new PostgresReviewRepository(dbConnection);
  const paymentRepository = new PostgresPaymentRepository(dbConnection);
  const userRepository = new PostgresUserRepository(dbConnection);
  const auditLogRepository = new PostgresAuditLogRepository(dbConnection);

  console.log('\n[3/10] Creating Security Services (OWASP Compliance)...');
  const passwordHasher = new PasswordHasher();
  const jwtService = new JwtService({
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresInMinutes: 15,
    refreshExpiresInDays: 7,
  });
  const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 100 });
  const inputValidator = new InputValidator();

  console.log('\n[4/10] Creating Payment Strategies (Strategy Pattern)...');
  const paypalStrategy = new PaypalPaymentStrategy({
    clientId: process.env.PAYPAL_CLIENT_ID || 'sandbox_client_id',
    clientSecret: process.env.PAYPAL_SECRET || 'sandbox_secret',
    sandboxMode: process.env.NODE_ENV !== 'production',
  });

  const creditCardStrategy = new CreditCardPaymentStrategy({
    apiKey: process.env.CC_API_KEY || 'sandbox_api_key',
    merchantId: process.env.CC_MERCHANT_ID || 'sandbox_merchant',
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  });

  console.log('\n[5/10] Creating Payment Factory (Factory Pattern)...');
  const paymentFactory = new PaymentFactory(
    {
      paypal: paypalStrategy,
      credit_card: creditCardStrategy,
    },
    'credit_card'
  );

  console.log('\n[6/10] Creating Notification Adapter (Adapter Pattern)...');
  const notificationService = new EmailNotificationAdapter();

  console.log('\n[7/10] Setting up Event Publisher & Observers (Observer Pattern)...');
  const eventPublisher = new EventPublisher();
  const orderNotificationObserver = new OrderNotificationObserver();
  eventPublisher.subscribe(orderNotificationObserver);

  console.log('\n[8/10] Creating Use Cases (Service Pattern)...');
  const idGenerator = new UuidGenerator();

  const createOrderUseCase = new CreateOrderUseCase(
    orderRepository, paymentFactory, notificationService, eventPublisher, idGenerator
  );
  const orderQueryUseCases = new OrderQueryUseCases(orderRepository);
  const orderManagementUseCases = new OrderManagementUseCases(orderRepository);
  const customerUseCases = new CustomerUseCases(customerRepository, addressRepository, idGenerator);
  const productUseCases = new ProductUseCases(productRepository, categoryRepository, idGenerator);
  const couponUseCases = new CouponUseCases(couponRepository, idGenerator);
  const reviewUseCases = new ReviewUseCases(reviewRepository, productRepository, orderRepository, idGenerator);
  const paymentUseCases = new PaymentUseCases(paymentRepository, orderRepository, idGenerator);
  const authUseCases = new AuthUseCases(userRepository, auditLogRepository, passwordHasher, jwtService, idGenerator);
  const userUseCases = new UserUseCases(userRepository, auditLogRepository, passwordHasher, idGenerator);
  const adminDashboardUseCases = new AdminDashboardUseCases(orderRepository, productRepository, customerRepository);

  console.log('\n[9/10] Creating Controllers (Presentation Layer)...');
  const orderController = new OrderController(createOrderUseCase, orderQueryUseCases, orderManagementUseCases);
  const customerController = new CustomerController(customerUseCases);
  const productController = new ProductController(productUseCases);
  const couponController = new CouponController(couponUseCases);
  const reviewController = new ReviewController(reviewUseCases);
  const paymentController = new PaymentController(paymentUseCases);
  const authController = new AuthController(authUseCases);
  const userController = new UserController(userUseCases);
  const adminController = new AdminController(adminDashboardUseCases);

  console.log('\n[10/10] Setting up Express application with security middleware...');
  const app: Application = express();

  // Security middleware (OWASP #5: Security Misconfiguration)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));
  app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
  }));
  
  // Request parsing with size limits (OWASP #4: Insecure Design)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Security middleware chain
  app.use(requestIdMiddleware());
  app.use(clientIpMiddleware());
  app.use(securityHeadersMiddleware());
  app.use(createInputSanitizationMiddleware(inputValidator));
  app.use(createRateLimitMiddleware(rateLimiter));

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
  });

  // Health check (public)
  app.get('/health', orderController.getHealth);

  // Auth routes (OWASP #7: Auth Failures - with rate limiting)
  const authRoutes = createAuthRoutes(authController, authUseCases, rateLimiter);
  app.use('/api/auth', authRoutes);

  // API routes with authentication middleware
  const authMiddleware = createAuthMiddleware(authUseCases);
  const apiRoutes = createRoutes(
    {
      order: orderController,
      customer: customerController,
      product: productController,
      coupon: couponController,
      review: reviewController,
      payment: paymentController,
      user: userController,
      admin: adminController,
    },
    {
      auth: authMiddleware,
      role: createRoleMiddleware,
      permission: () => authMiddleware, // Simplified for now
    }
  );
  app.use('/api', apiRoutes);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ BOOTSTRAP COMPLETE - All dependencies wired manually');
  console.log('='.repeat(60));
  console.log('\n🎨 Design Patterns:');
  console.log('  1. Singleton  2. Repository  3. Factory  4. Strategy');
  console.log('  5. Adapter    6. Observer    7. Service  8. Decorator');
  console.log('\n🔐 OWASP Top 10 Security:');
  console.log('  1. Broken Access Control    - Role-based middleware');
  console.log('  2. Cryptographic Failures   - PBKDF2 password hashing, JWT');
  console.log('  3. Injection                - Parameterized queries, input sanitization');
  console.log('  4. Insecure Design          - Request size limits, validation');
  console.log('  5. Security Misconfiguration - Helmet, security headers');
  console.log('  6. Vulnerable Components    - Manual dependency management');
  console.log('  7. Auth Failures            - Strong passwords, rate limiting, account lockout');
  console.log('  8. Data Integrity           - JWT signatures, audit logging');
  console.log('  9. Logging Failures         - Structured audit logs');
  console.log('  10. SSRF                    - Input validation, sanitization');
  console.log('');

  return app;
}

async function main(): Promise<void> {
  try {
    const app = await bootstrap();
    const port = parseInt(process.env.PORT || '3000', 10);

    app.listen(port, () => {
      console.log(`\n🌐 Server running at http://localhost:${port}`);
      console.log(`\n📋 API Endpoints:`);
      console.log(`   Health:     GET  /health`);
      console.log(`   Auth:       POST /api/auth/register, /api/auth/login, /api/auth/logout`);
      console.log(`   Orders:     POST /api/orders (auth required)`);
      console.log(`   Customers:  CRUD /api/customers (role-based)`);
      console.log(`   Products:   CRUD /api/products (public read, admin write)`);
      console.log(`   Categories: CRUD /api/categories (public read, admin write)`);
      console.log(`   Coupons:    CRUD /api/coupons (admin only)`);
      console.log(`   Reviews:    CRUD /api/reviews (approval workflow)`);
      console.log(`   Payments:   CRUD /api/payments (staff+ only)`);
      console.log(`   Users:      CRUD /api/users (admin only)`);
    });

    process.on('SIGTERM', async () => {
      console.log('\n[SHUTDOWN] Received SIGTERM, shutting down gracefully...');
      const db = DatabaseConnection.getInstance();
      await db.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n[SHUTDOWN] Received SIGINT, shutting down gracefully...');
      const db = DatabaseConnection.getInstance();
      await db.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main();

export { bootstrap };
