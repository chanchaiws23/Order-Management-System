# Order Management System

A Node.js/TypeScript Order Management System built with **Clean Architecture** and **8 Design Patterns**.

## Architecture

```
src/
├── domain/          # Core business logic (Entities, Value Objects, Events)
├── application/     # Use Cases, DTOs, Interfaces (Ports)
├── infrastructure/  # External concerns (DB, Adapters, Strategies)
├── presentation/    # Controllers, Routes, Decorators
├── shared/          # Utilities
└── app.ts           # Composition Root (Manual DI)
```

## Design Patterns Implemented

| Pattern | Location | Purpose |
|---------|----------|---------|
| **Repository** | `domain/repositories/`, `infrastructure/repositories/` | Data access abstraction |
| **Service** | `application/use-cases/` | Business logic orchestration |
| **Factory** | `application/factories/PaymentFactory.ts` | Payment strategy creation |
| **Strategy** | `infrastructure/strategies/` | Interchangeable payment methods |
| **Observer** | `infrastructure/observers/` | Domain event publishing |
| **Decorator** | `presentation/decorators/` | Execution time logging |
| **Adapter** | `infrastructure/adapters/` | External service integration |
| **Singleton** | `infrastructure/database/DatabaseConnection.ts` | Single DB instance |

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Create Order
```
POST /api/orders
Content-Type: application/json

{
  "customerId": "cust_123",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "items": [
    {
      "productId": "prod_001",
      "productName": "Widget",
      "unitPrice": 29.99,
      "quantity": 2
    }
  ],
  "currency": "USD",
  "paymentMethod": "credit_card",
  "shippingAddress": "123 Main St, City, Country"
}
```

## Manual Dependency Injection

All dependencies are wired manually in `src/app.ts` (Composition Root):

```typescript
// Singleton
const dbConnection = DatabaseConnection.getInstance();

// Repository
const orderRepository = new MongoOrderRepository(dbConnection);

// Strategies
const paypalStrategy = new PaypalPaymentStrategy(config);
const creditCardStrategy = new CreditCardPaymentStrategy(config);

// Factory
const paymentFactory = new PaymentFactory({ paypal, credit_card });

// Adapter
const notificationService = new EmailNotificationAdapter();

// Observer
const eventPublisher = new EventPublisher();
eventPublisher.subscribe(new OrderNotificationObserver());

// Use Case (Service)
const createOrderUseCase = new CreateOrderUseCase(
  orderRepository,
  paymentFactory,
  notificationService,
  eventPublisher,
  idGenerator
);

// Controller with Decorator
const orderController = new OrderController(createOrderUseCase);
```

## License

MIT
