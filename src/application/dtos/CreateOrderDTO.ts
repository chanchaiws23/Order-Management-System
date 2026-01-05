export interface OrderItemDTO {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface CreateOrderDTO {
  customerId: string;
  customerEmail: string;
  customerName: string;
  items: OrderItemDTO[];
  currency: string;
  shippingAddress?: string;
  billingAddress?: string;
  notes?: string;
  paymentMethod: 'paypal' | 'credit_card';
  paymentMetadata?: Record<string, string>;
}

export interface OrderResponseDTO {
  id: string;
  customerId: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  status: string;
  currency: string;
  totalAmount: number;
  itemCount: number;
  shippingAddress?: string;
  billingAddress?: string;
  notes?: string;
  paymentTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderResultDTO {
  success: boolean;
  order?: OrderResponseDTO;
  paymentTransactionId?: string;
  errorMessage?: string;
}
