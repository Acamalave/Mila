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
import type { AppNotification, Invoice } from "@/types";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useEventBus } from "@/providers/EventBusProvider";
import { setDocument, deleteDocument, onCollectionChange } from "@/lib/firestore";

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

  const clearNotification = useCallback(
    (notificationId: string) => {
      setAllNotifications((prev) => {
        const next = prev.filter((n) => n.id !== notificationId);
        persist(next);
        return next;
      });
      deleteDocument("notifications", notificationId).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    },
    [persist]
  );

  // Firestore real-time sync
  useEffect(() => {
    const unsub = onCollectionChange<AppNotification>("notifications", (firestoreNotifs) => {
      if (firestoreNotifs.length > 0) {
        setAllNotifications((prev) => {
          const merged = new Map<string, AppNotification>();
          for (const n of prev) merged.set(n.id, n);
          for (const n of firestoreNotifs) merged.set(n.id, n);
          const next = Array.from(merged.values());
          persist(next);
          return next;
        });
      }
    });
    return () => unsub();
  }, [persist]);

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
  }, [on, persist]);

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
