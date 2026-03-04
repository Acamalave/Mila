export type NotificationType =
  | "payment_request"
  | "payment_confirmed"
  | "appointment_update"
  | "appointment_reminder"
  | "general";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: { en: string; es: string };
  message: { en: string; es: string };
  read: boolean;
  createdAt: string;
  invoiceId?: string;
  bookingId?: string;
}
