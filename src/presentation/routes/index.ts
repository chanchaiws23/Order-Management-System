import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { CustomerController } from '../controllers/CustomerController';
import { ProductController } from '../controllers/ProductController';
import { CouponController } from '../controllers/CouponController';
import { ReviewController } from '../controllers/ReviewController';
import { PaymentController } from '../controllers/PaymentController';

export function createRoutes(controllers: {
  order: OrderController;
  customer: CustomerController;
  product: ProductController;
  coupon: CouponController;
  review: ReviewController;
  payment: PaymentController;
}): Router {
  const router = Router();

  // Orders
  router.post('/orders', controllers.order.createOrder);

  // Customers
  router.post('/customers', controllers.customer.createCustomer);
  router.get('/customers', controllers.customer.getAllCustomers);
  router.get('/customers/search', controllers.customer.searchCustomers);
  router.get('/customers/:id', controllers.customer.getCustomer);
  router.put('/customers/:id', controllers.customer.updateCustomer);
  router.delete('/customers/:id', controllers.customer.deleteCustomer);
  router.post('/customers/:id/addresses', controllers.customer.createAddress);
  router.get('/customers/:id/addresses', controllers.customer.getAddresses);
  router.delete('/customers/:id/addresses/:addressId', controllers.customer.deleteAddress);

  // Products
  router.post('/products', controllers.product.createProduct);
  router.get('/products', controllers.product.searchProducts);
  router.get('/products/featured', controllers.product.getFeaturedProducts);
  router.get('/products/:id', controllers.product.getProduct);
  router.get('/products/slug/:slug', controllers.product.getProductBySlug);
  router.put('/products/:id', controllers.product.updateProduct);
  router.delete('/products/:id', controllers.product.deleteProduct);
  router.patch('/products/:id/stock', controllers.product.adjustStock);

  // Categories
  router.post('/categories', controllers.product.createCategory);
  router.get('/categories', controllers.product.getAllCategories);
  router.get('/categories/:id', controllers.product.getCategory);
  router.put('/categories/:id', controllers.product.updateCategory);
  router.delete('/categories/:id', controllers.product.deleteCategory);

  // Coupons
  router.post('/coupons', controllers.coupon.createCoupon);
  router.get('/coupons', controllers.coupon.getAllCoupons);
  router.get('/coupons/active', controllers.coupon.getActiveCoupons);
  router.post('/coupons/validate', controllers.coupon.validateCoupon);
  router.get('/coupons/:id', controllers.coupon.getCoupon);
  router.put('/coupons/:id', controllers.coupon.updateCoupon);
  router.delete('/coupons/:id', controllers.coupon.deleteCoupon);
  router.patch('/coupons/:id/toggle', controllers.coupon.toggleStatus);

  // Reviews
  router.post('/reviews', controllers.review.createReview);
  router.get('/reviews/pending', controllers.review.getPendingReviews);
  router.get('/reviews/:id', controllers.review.getReview);
  router.put('/reviews/:id', controllers.review.updateReview);
  router.delete('/reviews/:id', controllers.review.deleteReview);
  router.patch('/reviews/:id/approve', controllers.review.approveReview);
  router.patch('/reviews/:id/reject', controllers.review.rejectReview);
  router.patch('/reviews/:id/helpful', controllers.review.markHelpful);
  router.get('/products/:productId/reviews', controllers.review.getProductReviews);
  router.get('/products/:productId/rating', controllers.review.getProductRating);

  // Payments
  router.post('/payments', controllers.payment.createPayment);
  router.get('/payments', controllers.payment.getAllPayments);
  router.get('/payments/stats', controllers.payment.getStats);
  router.get('/payments/:id', controllers.payment.getPayment);
  router.patch('/payments/:id/success', controllers.payment.markSuccess);
  router.patch('/payments/:id/failed', controllers.payment.markFailed);
  router.patch('/payments/:id/refund', controllers.payment.refund);
  router.get('/orders/:orderId/payments', controllers.payment.getOrderPayments);

  return router;
}
