export interface CommissionRecord {
  id: string;
  stylistId: string;
  bookingId?: string;
  invoiceId?: string;
  serviceId: string;
  serviceAmount: number;
  /** Percentage rate applied to serviceAmount. Zero when this is a flat-rate
   *  commission (see `commissionFlatPerUnit`). */
  commissionRate: number;
  commissionAmount: number;
  /** Optional: set when commission is a fixed amount per unit (e.g. $3 per
   *  product sold) instead of a percentage of the sale. The UI uses this
   *  to render "$3 fijo" instead of a meaningless rate. */
  commissionFlatPerUnit?: number;
  /** Optional: quantity sold — present when commissionFlatPerUnit is set
   *  so totalAmount = commissionFlatPerUnit × quantity is auditable. */
  quantity?: number;
  /** Optional: distinguishes "service" vs "product" rows so the UI can
   *  resolve the name from the right catalog without guessing. */
  itemType?: "service" | "product";
  status: "pending" | "paid";
  paidAt?: string;
  createdAt: string;
}
