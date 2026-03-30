export interface CommissionRecord {
  id: string;
  stylistId: string;
  bookingId?: string;
  invoiceId?: string;
  serviceId: string;
  serviceAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "paid";
  paidAt?: string;
  createdAt: string;
}
