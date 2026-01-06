import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { OrderController } from '../controllers/OrderController';
import { CustomerController } from '../controllers/CustomerController';
import { ProductController } from '../controllers/ProductController';
import { CouponController } from '../controllers/CouponController';
import { ReviewController } from '../controllers/ReviewController';
import { PaymentController } from '../controllers/PaymentController';
import { Role } from '../../domain/value-objects/Role';

export interface RouteMiddleware {
  auth: RequestHandler;
  role: (roles: Role[]) => RequestHandler;
  permission: (permission: string) => RequestHandler;
}

const noopMiddleware: RequestHandler = (_req: Request, _res: Response, next: NextFunction) => next();

export function createRoutes(
  controllers: {
    order: OrderController;
    customer: CustomerController;
    product: ProductController;
    coupon: CouponController;
    review: ReviewController;
    payment: PaymentController;
  },
  middleware?: RouteMiddleware
): Router {
  const router = Router();
  
  // Helper to apply auth middleware
  const auth = middleware?.auth || noopMiddleware;
  const adminOnly = middleware?.role ? middleware.role([Role.ADMIN, Role.SUPER_ADMIN]) : noopMiddleware;
  const staffUp = middleware?.role ? middleware.role([Role.STAFF, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN]) : noopMiddleware;

  // Orders (auth required for creating)
  router.post('/orders', auth, controllers.order.createOrder);

  // Customers (admin/staff for management, auth for own profile)
  router.post('/customers', controllers.customer.createCustomer);
  router.get('/customers', auth, staffUp, controllers.customer.getAllCustomers);
  router.get('/customers/search', auth, staffUp, controllers.customer.searchCustomers);
  router.get('/customers/:id', auth, controllers.customer.getCustomer);
  router.put('/customers/:id', auth, controllers.customer.updateCustomer);
  router.delete('/customers/:id', auth, adminOnly, controllers.customer.deleteCustomer);
  router.post('/customers/:id/addresses', auth, controllers.customer.createAddress);
  router.get('/customers/:id/addresses', auth, controllers.customer.getAddresses);
  router.delete('/customers/:id/addresses/:addressId', auth, controllers.customer.deleteAddress);

  // Products (public read, admin write)
  router.post('/products', auth, adminOnly, controllers.product.createProduct);
  router.get('/products', controllers.product.searchProducts);
  router.get('/products/featured', controllers.product.getFeaturedProducts);
  router.get('/products/:id', controllers.product.getProduct);
  router.get('/products/slug/:slug', controllers.product.getProductBySlug);
  router.put('/products/:id', auth, adminOnly, controllers.product.updateProduct);
  router.delete('/products/:id', auth, adminOnly, controllers.product.deleteProduct);
  router.patch('/products/:id/stock', auth, staffUp, controllers.product.adjustStock);

  // Categories (public read, admin write)
  router.post('/categories', auth, adminOnly, controllers.product.createCategory);
  router.get('/categories', controllers.product.getAllCategories);
  router.get('/categories/:id', controllers.product.getCategory);
  router.put('/categories/:id', auth, adminOnly, controllers.product.updateCategory);
  router.delete('/categories/:id', auth, adminOnly, controllers.product.deleteCategory);

  // Coupons (admin only for management)
  router.post('/coupons', auth, adminOnly, controllers.coupon.createCoupon);
  router.get('/coupons', auth, staffUp, controllers.coupon.getAllCoupons);
  router.get('/coupons/active', controllers.coupon.getActiveCoupons);
  router.post('/coupons/validate', auth, controllers.coupon.validateCoupon);
  router.get('/coupons/:id', auth, staffUp, controllers.coupon.getCoupon);
  router.put('/coupons/:id', auth, adminOnly, controllers.coupon.updateCoupon);
  router.delete('/coupons/:id', auth, adminOnly, controllers.coupon.deleteCoupon);
  router.patch('/coupons/:id/toggle', auth, adminOnly, controllers.coupon.toggleStatus);

  // Reviews (public read, auth for create, admin for approve)
  router.post('/reviews', auth, controllers.review.createReview);
  router.get('/reviews/pending', auth, staffUp, controllers.review.getPendingReviews);
  router.get('/reviews/:id', controllers.review.getReview);
  router.put('/reviews/:id', auth, controllers.review.updateReview);
  router.delete('/reviews/:id', auth, adminOnly, controllers.review.deleteReview);
  router.patch('/reviews/:id/approve', auth, staffUp, controllers.review.approveReview);
  router.patch('/reviews/:id/reject', auth, staffUp, controllers.review.rejectReview);
  router.patch('/reviews/:id/helpful', controllers.review.markHelpful);
  router.get('/products/:productId/reviews', controllers.review.getProductReviews);
  router.get('/products/:productId/rating', controllers.review.getProductRating);

  // Payments (admin/staff only)
  router.post('/payments', auth, staffUp, controllers.payment.createPayment);
  router.get('/payments', auth, staffUp, controllers.payment.getAllPayments);
  router.get('/payments/stats', auth, adminOnly, controllers.payment.getStats);
  router.get('/payments/:id', auth, staffUp, controllers.payment.getPayment);
  router.patch('/payments/:id/success', auth, staffUp, controllers.payment.markSuccess);
  router.patch('/payments/:id/failed', auth, staffUp, controllers.payment.markFailed);
  router.patch('/payments/:id/refund', auth, adminOnly, controllers.payment.refund);
  router.get('/orders/:orderId/payments', auth, controllers.payment.getOrderPayments);

  return router;
}
