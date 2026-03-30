"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import type { AppNotification, Invoice, Booking, User, Stylist } from "@/types";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import { stylists as seedStylists } from "@/data/stylists";
import { useAuth } from "@/providers/AuthProvider";
import { useEventBus } from "@/providers/EventBusProvider";
import { setDocument, deleteDocument, onCollectionChange } from "@/lib/firestore";

// ---------------------------------------------------------------------------
// External notification dispatch (email + WhatsApp) — fire-and-forget
// ---------------------------------------------------------------------------

async function dispatchExternalNotifications(
  recipients: Array<{ email?: string; phone?: string; countryCode?: string }>,
  template: string,
  data: Record<string, unknown>,
  language?: string
) {
  const promises: Promise<unknown>[] = [];

  for (const recipient of recipients) {
    if (recipient.email) {
      promises.push(
        fetch("/api/notifications/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: recipient.email, template, data, language: language ?? "es" }),
        }).catch((err) => console.warn("[Mila] External email dispatch failed:", err))
      );
    }

    if (recipient.phone) {
      promises.push(
        fetch("/api/notifications/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: recipient.phone,
            countryCode: recipient.countryCode ?? "+507",
            template,
            data,
            language: language ?? "es",
          }),
        }).catch((err) => console.warn("[Mila] External WhatsApp dispatch failed:", err))
      );
    }
  }

  await Promise.allSettled(promises);
}

/** Look up a user from the local registry by id */
function findUserById(userId: string | null): User | undefined {
  if (!userId) return undefined;
  const users = getStoredData<User[]>("mila-users", []);
  return users.find((u) => u.id === userId);
}

/** Look up a stylist (seed + custom) by id */
function findStylistById(stylistId: string): Stylist | undefined {
  const custom = getStoredData<Stylist[]>("mila-staff-custom", []);
  return seedStylists.find((s) => s.id === stylistId) || custom.find((s) => s.id === stylistId);
}

/** Resolve contact info for a stylist: try linked user first, then fall back */
function getStylistContact(stylistId: string): { email?: string; phone?: string; countryCode?: string } | undefined {
  const stylist = findStylistById(stylistId);
  if (!stylist) return undefined;
  // Try linked user in registry
  if (stylist.linkedPhone) {
    const linkedUser = getStoredData<User[]>("mila-users", []).find((u) => u.phone === stylist.linkedPhone);
    if (linkedUser) return { email: linkedUser.email, phone: linkedUser.phone, countryCode: linkedUser.countryCode };
  }
  return undefined;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { on, emit } = useEventBus();

  const [allNotifications, setAllNotifications] = useState<AppNotification[]>(() =>
    getStoredData<AppNotification[]>("mila-notifications", [])
  );

  const notifications = useMemo(
    () =>
      user
        ? allNotifications
            .filter((n) => n.userId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [],
    [allNotifications, user]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const persist = useCallback((next: AppNotification[]) => {
    setStoredData("mila-notifications", next);
  }, []);

  const addNotification = useCallback(
    (data: Omit<AppNotification, "id" | "createdAt" | "read">) => {
      const newNotif: AppNotification = {
        ...data,
        id: `notif-${generateId()}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setAllNotifications((prev) => {
        const next = [...prev, newNotif];
        persist(next);
        return next;
      });
      const { id, ...notifData } = newNotif;
      setDocument("notifications", id, notifData).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
      emit("notification:created", newNotif);
    },
    [emit, persist]
  );

  const markAsRead = useCallback(
    (notificationId: string) => {
      setAllNotifications((prev) => {
        const next = prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        persist(next);
        return next;
      });
      setDocument("notifications", notificationId, { read: true }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
      emit("notification:read", notificationId);
    },
    [emit, persist]
  );

  const markAllAsRead = useCallback(() => {
    if (!user) return;
    setAllNotifications((prev) => {
      const next = prev.map((n) =>
        n.userId === user.id ? { ...n, read: true } : n
      );
      persist(next);

      // Sync unread notifications to Firestore
      prev
        .filter((n) => n.userId === user.id && !n.read)
        .forEach((notif) => {
          setDocument("notifications", notif.id, { ...notif, read: true })
            .catch((err) => console.warn("[Mila] Failed to sync notification read status:", err));
        });

      return next;
    });
  }, [user, persist]);

  const [deletedNotifIds, setDeletedNotifIds] = useState<string[]>(() =>
    getStoredData<string[]>("mila-notifications-deleted", [])
  );

  const clearNotification = useCallback(
    async (notificationId: string) => {
      // Track deleted ID so the listener doesn't re-add it
      setDeletedNotifIds((prev) => {
        if (prev.includes(notificationId)) return prev;
        const next = [...prev, notificationId];
        setStoredData("mila-notifications-deleted", next);
        return next;
      });

      setAllNotifications((prev) => {
        const next = prev.filter((n) => n.id !== notificationId);
        persist(next);
        return next;
      });

      try {
        await deleteDocument("notifications", notificationId);
      } catch (err) {
        console.warn("[Mila] Firestore sync failed:", err);
      }
    },
    [persist]
  );

  // Firestore real-time sync
  useEffect(() => {
    const unsub = onCollectionChange<AppNotification>("notifications", (firestoreNotifs) => {
      if (firestoreNotifs.length > 0) {
        const currentDeleted = getStoredData<string[]>("mila-notifications-deleted", []);
        setAllNotifications((prev) => {
          const merged = new Map<string, AppNotification>();
          for (const n of prev) merged.set(n.id, n);
          for (const n of firestoreNotifs) {
            if (!currentDeleted.includes(n.id)) {
              merged.set(n.id, n);
            }
          }
          // Also filter out any that are in the deleted list from prev
          const next = Array.from(merged.values()).filter((n) => !currentDeleted.includes(n.id));
          persist(next);
          return next;
        });
      }
    });
    return () => unsub();
  }, [persist]);

  // Helper to create and persist booking notifications
  const createBookingNotifications = useCallback(
    (notifs: AppNotification[]) => {
      setAllNotifications((prev) => {
        const next = [...prev, ...notifs];
        persist(next);
        return next;
      });
      for (const notif of notifs) {
        const { id, ...notifData } = notif;
        setDocument("notifications", id, notifData).catch((err) =>
          console.warn("[Mila] Firestore notification sync failed:", err)
        );
      }
    },
    [persist]
  );

  // Auto-create notifications from events
  useEffect(() => {
    const unsubs = [
      on("invoice:sent", (payload) => {
        const invoice = payload as Invoice;
        if (invoice?.clientId) {
          const newNotif: AppNotification = {
            id: `notif-${generateId()}`,
            userId: invoice.clientId,
            type: "payment_request",
            title: {
              en: "Payment Request",
              es: "Solicitud de Pago",
            },
            message: {
              en: `You have a new invoice for $${invoice.amount.toFixed(2)}. Tap to pay.`,
              es: `Tienes una nueva factura por $${invoice.amount.toFixed(2)}. Toca para pagar.`,
            },
            read: false,
            createdAt: new Date().toISOString(),
            invoiceId: invoice.id,
          };
          setAllNotifications((prev) => {
            const next = [...prev, newNotif];
            persist(next);
            return next;
          });
          const { id, ...notifData } = newNotif;
          setDocument("notifications", id, notifData).catch((err) => console.warn("[Mila] Firestore sync failed:", err));

          // --- External: invoice-sent to client ---
          const invoiceClient = findUserById(invoice.clientId);
          if (invoiceClient) {
            dispatchExternalNotifications(
              [{ email: invoiceClient.email, phone: invoiceClient.phone, countryCode: invoiceClient.countryCode }],
              "invoice-sent",
              {
                clientName: invoiceClient.name,
                invoiceId: invoice.id,
                amount: invoice.amount,
                dueDate: invoice.dueDate,
              }
            );
          }
        }
      }),
      on("invoice:paid", (payload) => {
        const invoice = payload as Invoice;
        if (invoice) {
          const adminNotif: AppNotification = {
            id: `notif-${generateId()}`,
            userId: "user-admin",
            type: "payment_confirmed",
            title: {
              en: "Payment Received",
              es: "Pago Recibido",
            },
            message: {
              en: `${invoice.clientName} paid invoice #${invoice.id.slice(-6)} for $${invoice.amount.toFixed(2)}`,
              es: `${invoice.clientName} pagó la factura #${invoice.id.slice(-6)} por $${invoice.amount.toFixed(2)}`,
            },
            read: false,
            createdAt: new Date().toISOString(),
            invoiceId: invoice.id,
          };
          const clientNotif: AppNotification = {
            id: `notif-${generateId()}`,
            userId: invoice.clientId,
            type: "payment_confirmed",
            title: {
              en: "Payment Confirmed",
              es: "Pago Confirmado",
            },
            message: {
              en: `Your payment of $${invoice.amount.toFixed(2)} has been processed successfully.`,
              es: `Tu pago de $${invoice.amount.toFixed(2)} ha sido procesado exitosamente.`,
            },
            read: false,
            createdAt: new Date().toISOString(),
            invoiceId: invoice.id,
          };
          setAllNotifications((prev) => {
            const next = [...prev, adminNotif, clientNotif];
            persist(next);
            return next;
          });
          const { id: adminId, ...adminData } = adminNotif;
          const { id: clientId, ...clientData } = clientNotif;
          setDocument("notifications", adminId, adminData).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
          setDocument("notifications", clientId, clientData).catch((err) => console.warn("[Mila] Firestore sync failed:", err));

          // --- External: payment-confirmed to client ---
          const paidClient = findUserById(invoice.clientId);
          if (paidClient) {
            dispatchExternalNotifications(
              [{ email: paidClient.email, phone: paidClient.phone, countryCode: paidClient.countryCode }],
              "payment-confirmed",
              {
                clientName: paidClient.name,
                invoiceId: invoice.id,
                amount: invoice.amount,
              }
            );
          }
        }
      }),
      on("booking:updated", (payload) => {
        const booking = payload as Booking;
        if (!booking) return;

        const notifs: AppNotification[] = [];
        const now = new Date().toISOString();

        if (booking.status === "pending" || booking.status === "confirmed") {
          // New booking created
          notifs.push({
            id: `notif-${generateId()}`,
            userId: "user-admin",
            type: "appointment_update",
            title: { en: "New Booking", es: "Nueva Reserva" },
            message: {
              en: `A new booking has been created for ${booking.date} at ${booking.startTime}.`,
              es: `Se ha creado una nueva reserva para el ${booking.date} a las ${booking.startTime}.`,
            },
            read: false,
            createdAt: now,
            bookingId: booking.id,
          });
          if (booking.stylistId) {
            notifs.push({
              id: `notif-${generateId()}`,
              userId: booking.stylistId,
              type: "appointment_update",
              title: { en: "New Appointment", es: "Nueva Cita" },
              message: {
                en: `You have a new appointment on ${booking.date} at ${booking.startTime}.`,
                es: `Tienes una nueva cita el ${booking.date} a las ${booking.startTime}.`,
              },
              read: false,
              createdAt: now,
              bookingId: booking.id,
            });
          }
        } else if (booking.status === "cancelled") {
          // Booking cancelled
          notifs.push({
            id: `notif-${generateId()}`,
            userId: "user-admin",
            type: "appointment_update",
            title: { en: "Booking Cancelled", es: "Reserva Cancelada" },
            message: {
              en: `A booking for ${booking.date} has been cancelled.`,
              es: `Una reserva para el ${booking.date} ha sido cancelada.`,
            },
            read: false,
            createdAt: now,
            bookingId: booking.id,
          });
          if (booking.stylistId) {
            notifs.push({
              id: `notif-${generateId()}`,
              userId: booking.stylistId,
              type: "appointment_update",
              title: { en: "Appointment Cancelled", es: "Cita Cancelada" },
              message: {
                en: `An appointment on ${booking.date} has been cancelled.`,
                es: `Una cita el ${booking.date} ha sido cancelada.`,
              },
              read: false,
              createdAt: now,
              bookingId: booking.id,
            });
          }
        }

        // Rescheduled bookings emit booking:updated with a date field change
        // Detect reschedule: booking has a date but status is not cancelled
        if (booking.date && booking.status !== "cancelled" && booking.status !== "pending" && booking.status !== "confirmed") {
          notifs.push({
            id: `notif-${generateId()}`,
            userId: "user-admin",
            type: "appointment_update",
            title: { en: "Booking Rescheduled", es: "Reserva Reprogramada" },
            message: {
              en: `A booking has been rescheduled to ${booking.date}.`,
              es: `Una reserva ha sido reprogramada para el ${booking.date}.`,
            },
            read: false,
            createdAt: now,
            bookingId: booking.id,
          });
          if (booking.stylistId) {
            notifs.push({
              id: `notif-${generateId()}`,
              userId: booking.stylistId,
              type: "appointment_update",
              title: { en: "Appointment Rescheduled", es: "Cita Reprogramada" },
              message: {
                en: `An appointment has been rescheduled to ${booking.date}.`,
                es: `Una cita ha sido reprogramada para el ${booking.date}.`,
              },
              read: false,
              createdAt: now,
              bookingId: booking.id,
            });
          }
        }

        if (notifs.length > 0) {
          createBookingNotifications(notifs);
        }

        // --- External notifications (email + WhatsApp) ---
        const client = findUserById(booking.clientId);
        const bookingData: Record<string, unknown> = {
          clientName: client?.name ?? booking.guestName ?? "Client",
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          bookingId: booking.id,
        };

        if (booking.status === "confirmed" || booking.status === "pending") {
          // New / confirmed booking → confirmation to client
          if (client) {
            dispatchExternalNotifications(
              [{ email: client.email, phone: client.phone, countryCode: client.countryCode }],
              "booking-confirmation",
              bookingData
            );
          }
        } else if (booking.status === "cancelled") {
          // Cancellation → notify client + stylist
          const recipients: Array<{ email?: string; phone?: string; countryCode?: string }> = [];
          if (client) recipients.push({ email: client.email, phone: client.phone, countryCode: client.countryCode });
          if (booking.stylistId) {
            const stylistContact = getStylistContact(booking.stylistId);
            if (stylistContact) recipients.push(stylistContact);
          }
          if (recipients.length > 0) {
            dispatchExternalNotifications(recipients, "booking-cancellation", bookingData);
          }
        } else if (booking.date) {
          // Rescheduled → confirmation with updated details to client
          if (client) {
            dispatchExternalNotifications(
              [{ email: client.email, phone: client.phone, countryCode: client.countryCode }],
              "booking-confirmation",
              bookingData
            );
          }
        }
      }),
      on("notification:created", () => {
        setAllNotifications(getStoredData<AppNotification[]>("mila-notifications", []));
      }),
      on("notification:read", () => {
        setAllNotifications(getStoredData<AppNotification[]>("mila-notifications", []));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on, persist, createBookingNotifications]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
}
