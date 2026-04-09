export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "declined";
export type PaymentMethod = "card" | "counter";

export interface Invoice {
  id: string;
  bookingId?: string;
  stylistId?: string;
  clientId: string;
  clientName: string;
  serviceId?: string;
  description?: string | { en: string; es: string };
  items?: InvoiceItem[];
  date: string;
  dueDate?: string;
  amount: number;       // Grand total (after discount + ITBMS)
  subtotal?: number;    // Base amount before discount and tax
  discount?: number;    // Discount percentage applied (0-100)
  discountAmount?: number; // Computed discount amount
  afterDiscount?: number;  // Subtotal after discount, before tax
  taxAmount?: number;
  taxRate?: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  counterNote?: string;
  sentAt?: string;
  paidAt?: string;
  declinedAt?: string;
  paymentTransactionId?: string;
  createdAt: string;
}

export interface InvoiceItem {
  type: "service" | "product";
  id: string;
  name: string;
  price: number;
  quantity: number;
}
