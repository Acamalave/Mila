export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface Invoice {
  id: string;
  bookingId?: string;
  clientId: string;
  clientName: string;
  serviceId?: string;
  description?: { en: string; es: string };
  date: string;
  dueDate?: string;
  amount: number;
  status: InvoiceStatus;
  sentAt?: string;
  paidAt?: string;
  paymentTransactionId?: string;
  createdAt: string;
}
