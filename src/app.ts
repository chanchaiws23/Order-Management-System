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

// Infrastructure - Adapters & Strategies
import { EmailNotificationAdapter } from './infrastructure/adapters/EmailNotificationAdapter';
import { EventPublisher } from './infrastructure/observers/EventPublisher';
import { OrderNotificationObserver } from './infrastructure/observers/OrderNotificationObserver';
import { PaypalPaymentStrategy } from './infrastructure/strategies/PaypalPaymentStrategy';
import { CreditCardPaymentStrategy } from './infrastructure/strategies/CreditCardPaymentStrategy';

// Application - Use Cases
import { PaymentFactory } from './application/factories/PaymentFactory';
import { CreateOrderUseCase } from './application/use-cases/CreateOrderUseCase';
import { CustomerUseCases } from './application/use-cases/CustomerUseCases';
import { ProductUseCases } from './application/use-cases/ProductUseCases';
import { CouponUseCases } from './application/use-cases/CouponUseCases';
import { ReviewUseCases } from './application/use-cases/ReviewUseCases';
import { PaymentUseCases } from './application/use-cases/PaymentUseCases';

// Presentation - Controllers
import { OrderController } from './presentation/controllers/OrderController';
import { CustomerController } from './presentation/controllers/CustomerController';
import { ProductController } from './presentation/controllers/ProductController';
import { CouponController } from './presentation/controllers/CouponController';
import { ReviewController } from './presentation/controllers/ReviewController';
import { PaymentController } from './presentation/controllers/PaymentController';
import { createRoutes } from './presentation/routes';

// Shared
import { UuidGenerator } from './shared/utils/generateId';

async function bootstrap(): Promise<Application> {
  console.log('='.repeat(60));
  console.log('🚀 BOOTSTRAPPING ORDER MANAGEMENT SYSTEM');
  console.log('='.repeat(60));

  console.log('\n[1/7] Initializing Database Connection (Singleton)...');
  const dbConnection = DatabaseConnection.getInstance();
  await dbConnection.connect({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'order_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    maxPoolSize: 10,
    minPoolSize: 2,
  });

  console.log('\n[2/8] Creating Repositories (Repository Pattern)...');
  const orderRepository = new PostgresOrderRepository(dbConnection);
  const customerRepository = new PostgresCustomerRepository(dbConnection);
  const addressRepository = new PostgresAddressRepository(dbConnection);
  const productRepository = new PostgresProductRepository(dbConnection);
  const categoryRepository = new PostgresCategoryRepository(dbConnection);
  const couponRepository = new PostgresCouponRepository(dbConnection);
  const reviewRepository = new PostgresReviewRepository(dbConnection);
  const paymentRepository = new PostgresPaymentRepository(dbConnection);

  console.log('\n[3/8] Creating Payment Strategies (Strategy Pattern)...');
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

  console.log('\n[4/8] Creating Payment Factory (Factory Pattern)...');
  const paymentFactory = new PaymentFactory(
    {
      paypal: paypalStrategy,
      credit_card: creditCardStrategy,
    },
    'credit_card'
  );

  console.log('\n[5/8] Creating Notification Adapter (Adapter Pattern)...');
  const notificationService = new EmailNotificationAdapter();

  console.log('\n[6/8] Setting up Event Publisher & Observers (Observer Pattern)...');
  const eventPublisher = new EventPublisher();
  const orderNotificationObserver = new OrderNotificationObserver();
  eventPublisher.subscribe(orderNotificationObserver);

  console.log('\n[7/8] Creating Use Cases (Service Pattern)...');
  const idGenerator = new UuidGenerator();

  const createOrderUseCase = new CreateOrderUseCase(
    orderRepository, paymentFactory, notificationService, eventPublisher, idGenerator
  );
  const customerUseCases = new CustomerUseCases(customerRepository, addressRepository, idGenerator);
  const productUseCases = new ProductUseCases(productRepository, categoryRepository, idGenerator);
  const couponUseCases = new CouponUseCases(couponRepository, idGenerator);
  const reviewUseCases = new ReviewUseCases(reviewRepository, productRepository, orderRepository, idGenerator);
  const paymentUseCases = new PaymentUseCases(paymentRepository, orderRepository, idGenerator);

  console.log('\n[8/8] Creating Controllers (Presentation Layer)...');
  const orderController = new OrderController(createOrderUseCase);
  const customerController = new CustomerController(customerUseCases);
  const productController = new ProductController(productUseCases);
  const couponController = new CouponController(couponUseCases);
  const reviewController = new ReviewController(reviewUseCases);
  const paymentController = new PaymentController(paymentUseCases);

  console.log('\n[EXPRESS] Setting up Express application...');
  const app: Application = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
  });

  app.get('/health', orderController.getHealth);

  const apiRoutes = createRoutes({
    order: orderController,
    customer: customerController,
    product: productController,
    coupon: couponController,
    review: reviewController,
    payment: paymentController,
  });
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
  console.log('\nDesign Patterns Used:');
  console.log('  1. Singleton     - DatabaseConnection');
  console.log('  2. Repository    - PostgresOrderRepository, PostgresCustomerRepository, etc.');
  console.log('  3. Factory       - PaymentFactory');
  console.log('  4. Strategy      - PaypalPaymentStrategy, CreditCardPaymentStrategy');
  console.log('  5. Adapter       - EmailNotificationAdapter');
  console.log('  6. Observer      - EventPublisher, OrderNotificationObserver');
  console.log('  7. Service       - CreateOrderUseCase, CustomerUseCases, etc.');
  console.log('  8. Decorator     - LogExecutionTime');
  console.log('');

  return app;
}

async function main(): Promise<void> {
  try {
    const app = await bootstrap();
    const port = parseInt(process.env.PORT || '3000', 10);

    app.listen(port, () => {
      console.log(`\n🌐 Server running at http://localhost:${port}`);
      console.log(`\n📋 Available API Endpoints:`);
      console.log(`   Health:     GET  /health`);
      console.log(`   Orders:     POST /api/orders`);
      console.log(`   Customers:  GET|POST /api/customers, GET|PUT|DELETE /api/customers/:id`);
      console.log(`   Products:   GET|POST /api/products, GET|PUT|DELETE /api/products/:id`);
      console.log(`   Categories: GET|POST /api/categories, GET|PUT|DELETE /api/categories/:id`);
      console.log(`   Coupons:    GET|POST /api/coupons, POST /api/coupons/validate`);
      console.log(`   Reviews:    GET|POST /api/reviews, PATCH /api/reviews/:id/approve`);
      console.log(`   Payments:   GET|POST /api/payments, GET /api/payments/stats`);
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
