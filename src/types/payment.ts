export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown";

export interface CreditCard {
  id: string;
  userId: string;
  cardholderName: string;
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardBrand: CardBrand;
  isDefault: boolean;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  invoiceId: string;
  amount: number;
  paymentMethodId: string;
  paymentMethod?: "card" | "counter";
  counterNote?: string;
  status: "processing" | "completed" | "failed";
  idempotencyKey?: string;
  createdAt: string;
}
