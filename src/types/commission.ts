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
  /** YYYY-MM-DD date the work was performed — copied from the source
   *  invoice's `date` (or the booking date). Quincena grouping and period
   *  filters use this instead of `createdAt`, so billing loaded
   *  retroactively still lands in the correct fortnight. Records created
   *  before this field existed lack it; readers must fall back to the
   *  source invoice date, then `createdAt` (see commissionWorkDate). */
  workDate?: string;
  /** Display name of the service/product captured at sale time, so views
   *  don't depend on the catalog still containing the item. */
  serviceName?: string;
  status: "pending" | "paid";
  paidAt?: string;
  createdAt: string;
}
