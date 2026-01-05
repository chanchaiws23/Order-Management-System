import express, { Application, Request, Response, NextFunction } from 'express';

import { DatabaseConnection } from './infrastructure/database/DatabaseConnection';
import { MongoOrderRepository } from './infrastructure/repositories/MongoOrderRepository';
import { EmailNotificationAdapter } from './infrastructure/adapters/EmailNotificationAdapter';
import { EventPublisher } from './infrastructure/observers/EventPublisher';
import { OrderNotificationObserver } from './infrastructure/observers/OrderNotificationObserver';
import { PaypalPaymentStrategy } from './infrastructure/strategies/PaypalPaymentStrategy';
import { CreditCardPaymentStrategy } from './infrastructure/strategies/CreditCardPaymentStrategy';

import { PaymentFactory } from './application/factories/PaymentFactory';
import { CreateOrderUseCase } from './application/use-cases/CreateOrderUseCase';

import { OrderController } from './presentation/controllers/OrderController';

import { UuidGenerator } from './shared/utils/generateId';

async function bootstrap(): Promise<Application> {
  console.log('='.repeat(60));
  console.log('🚀 BOOTSTRAPPING ORDER MANAGEMENT SYSTEM');
  console.log('='.repeat(60));

  console.log('\n[1/7] Initializing Database Connection (Singleton)...');
  const dbConnection = DatabaseConnection.getInstance();
  await dbConnection.connect({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '27017', 10),
    database: process.env.DB_NAME || 'order_management',
    maxPoolSize: 10,
    minPoolSize: 2,
  });

  console.log('\n[2/7] Creating Repository (Repository Pattern)...');
  const orderRepository = new MongoOrderRepository(dbConnection);

  console.log('\n[3/7] Creating Payment Strategies (Strategy Pattern)...');
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

  console.log('\n[4/7] Creating Payment Factory (Factory Pattern)...');
  const paymentFactory = new PaymentFactory(
    {
      paypal: paypalStrategy,
      credit_card: creditCardStrategy,
    },
    'credit_card'
  );

  console.log('\n[5/7] Creating Notification Adapter (Adapter Pattern)...');
  const notificationService = new EmailNotificationAdapter();

  console.log('\n[6/7] Setting up Event Publisher & Observers (Observer Pattern)...');
  const eventPublisher = new EventPublisher();
  const orderNotificationObserver = new OrderNotificationObserver();
  eventPublisher.subscribe(orderNotificationObserver);

  console.log('\n[7/7] Creating Use Cases and Controllers...');
  const idGenerator = new UuidGenerator();

  const createOrderUseCase = new CreateOrderUseCase(
    orderRepository,
    paymentFactory,
    notificationService,
    eventPublisher,
    idGenerator
  );

  const orderController = new OrderController(createOrderUseCase);

  console.log('\n[EXPRESS] Setting up Express application...');
  const app: Application = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
  });

  app.get('/health', orderController.getHealth);

  app.post('/api/orders', orderController.createOrder);

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
  console.log('\nDependency Graph:');
  console.log('  DatabaseConnection (Singleton)');
  console.log('    └── MongoOrderRepository (Repository)');
  console.log('          └── CreateOrderUseCase (Service)');
  console.log('                ├── PaymentFactory (Factory)');
  console.log('                │     ├── PaypalPaymentStrategy (Strategy)');
  console.log('                │     └── CreditCardPaymentStrategy (Strategy)');
  console.log('                ├── EmailNotificationAdapter (Adapter)');
  console.log('                └── EventPublisher (Observer)');
  console.log('                      └── OrderNotificationObserver');
  console.log('  OrderController (Presentation)');
  console.log('    └── LogExecutionTime (Decorator)');
  console.log('');

  return app;
}

async function main(): Promise<void> {
  try {
    const app = await bootstrap();
    const port = parseInt(process.env.PORT || '3000', 10);

    app.listen(port, () => {
      console.log(`\n🌐 Server running at http://localhost:${port}`);
      console.log(`   Health check: GET  http://localhost:${port}/health`);
      console.log(`   Create order: POST http://localhost:${port}/api/orders`);
      console.log('\n📦 Sample request body for POST /api/orders:');
      console.log(JSON.stringify({
        customerId: 'cust_123',
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        items: [
          {
            productId: 'prod_001',
            productName: 'Widget',
            unitPrice: 29.99,
            quantity: 2,
          },
        ],
        currency: 'USD',
        paymentMethod: 'credit_card',
        shippingAddress: '123 Main St, City, Country',
      }, null, 2));
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
