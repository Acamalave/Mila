export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type PaymentMethod = "card" | "counter";

export interface Invoice {
  id: string;
  bookingId?: string;
  clientId: string;
  clientName: string;
  serviceId?: string;
  description?: string | { en: string; es: string };
  items?: InvoiceItem[];
  date: string;
  dueDate?: string;
  amount: number;
  subtotal?: number;
  taxAmount?: number;
  taxRate?: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  counterNote?: string;
  sentAt?: string;
  paidAt?: string;
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
