/**
 * Operating expense recorded by the accountant. Subtracted from gross
 * revenue when calculating the salon's net for a given period.
 */
export type ExpenseCategory =
  | "rent"
  | "salaries"
  | "supplies"
  | "utilities"
  | "marketing"
  | "equipment"
  | "tax"
  | "other";

export interface Expense {
  id: string;
  /** Display name of the expense (e.g. "Renta local enero"). */
  description: string;
  amount: number; // USD, positive
  /** ISO date string YYYY-MM-DD — used for period filtering. */
  date: string;
  category: ExpenseCategory;
  /** Optional free-text note for context. */
  notes?: string;
  createdAt: string;
  createdBy?: string;
}
