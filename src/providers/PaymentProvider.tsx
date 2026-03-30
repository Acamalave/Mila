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
import type { CreditCard, PaymentTransaction, CardBrand } from "@/types";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useEventBus } from "@/providers/EventBusProvider";
import { setDocument, deleteDocument, onCollectionChange } from "@/lib/firestore";

export interface CardPaymentDetails {
  cardNumber: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardCvv: string;
  cardholderName: string;
}

interface PaymentContextValue {
  savedCards: CreditCard[];
  transactions: PaymentTransaction[];
  addCard: (card: Omit<CreditCard, "id" | "createdAt">) => void;
  removeCard: (cardId: string) => void;
  setDefaultCard: (cardId: string) => void;
  processPayment: (invoiceId: string, cardId: string, amount: number, cardDetails?: CardPaymentDetails) => Promise<PaymentTransaction>;
  processCounterPayment: (invoiceId: string, amount: number, note: string) => PaymentTransaction;
  getClientCards: (clientId: string) => CreditCard[];
}

const PaymentContext = createContext<PaymentContextValue | null>(null);

export function detectCardBrand(cardNumber: string): CardBrand {
  const cleaned = cardNumber.replace(/\s/g, "");
  if (cleaned.startsWith("4")) return "visa";
  if (cleaned.startsWith("5") || cleaned.startsWith("2")) return "mastercard";
  if (cleaned.startsWith("3")) return "amex";
  if (cleaned.startsWith("6")) return "discover";
  return "unknown";
}

export function PaymentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { emit, on } = useEventBus();

  const [allCards, setAllCards] = useState<CreditCard[]>(() =>
    getStoredData<CreditCard[]>("mila-payment-methods", [])
  );
  const [allTransactions, setAllTransactions] = useState<PaymentTransaction[]>(() =>
    getStoredData<PaymentTransaction[]>("mila-payment-transactions", [])
  );

  const savedCards = useMemo(
    () => (user ? allCards.filter((c) => c.userId === user.id) : []),
    [allCards, user]
  );

  const transactions = useMemo(
    () => (user ? allTransactions.filter((t) => t.userId === user.id) : []),
    [allTransactions, user]
  );

  const addCard = useCallback(
    (data: Omit<CreditCard, "id" | "createdAt">) => {
      const newCard: CreditCard = {
        ...data,
        id: `card-${generateId()}`,
        createdAt: new Date().toISOString(),
      };
      setAllCards((prev) => {
        let next: CreditCard[];
        if (newCard.isDefault || !prev.some((c) => c.userId === data.userId)) {
          next = prev.map((c) =>
            c.userId === data.userId ? { ...c, isDefault: false } : c
          );
          next.push({ ...newCard, isDefault: true });
        } else {
          next = [...prev, newCard];
        }
        setStoredData("mila-payment-methods", next);
        return next;
      });
      const { id, ...cardData } = newCard;
      setDocument("payment-methods", id, cardData).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    },
    []
  );

  const removeCard = useCallback((cardId: string) => {
    setAllCards((prev) => {
      const next = prev.filter((c) => c.id !== cardId);
      setStoredData("mila-payment-methods", next);
      return next;
    });
    deleteDocument("payment-methods", cardId).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
  }, []);

  const setDefaultCard = useCallback(
    (cardId: string) => {
      if (!user) return;
      setAllCards((prev) => {
        const next = prev.map((c) =>
          c.userId === user.id
            ? { ...c, isDefault: c.id === cardId }
            : c
        );
        setStoredData("mila-payment-methods", next);
        return next;
      });
    },
    [user]
  );

  const processPayment = useCallback(
    async (invoiceId: string, cardId: string, amount: number, cardDetails?: CardPaymentDetails): Promise<PaymentTransaction> => {
      if (!user) throw new Error("User must be authenticated to process payment");

      // Call Paguelo Facil via our API route
      if (cardDetails) {
        const res = await fetch("/api/payments/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            description: `Mila Concept - Invoice ${invoiceId}`,
            clientName: cardDetails.cardholderName,
            clientEmail: user.email || "",
            clientPhone: user.phone || "",
            cardNumber: cardDetails.cardNumber,
            cardExpMonth: cardDetails.cardExpMonth,
            cardExpYear: cardDetails.cardExpYear,
            cardCvv: cardDetails.cardCvv,
            invoiceId,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          // Record the failed transaction attempt
          const failedTxn: PaymentTransaction = {
            id: `txn-${generateId()}`,
            userId: user.id,
            invoiceId,
            amount,
            paymentMethodId: cardId,
            status: "failed",
            createdAt: new Date().toISOString(),
          };
          setAllTransactions((prev) => {
            const next = [...prev, failedTxn];
            setStoredData("mila-payment-transactions", next);
            return next;
          });
          const { id: fId, ...fData } = failedTxn;
          setDocument("payments", fId, fData).catch(() => {});
          emit("payment:failed", failedTxn);
          throw new Error(data.error || data.message || "Payment declined");
        }
      }

      const transaction: PaymentTransaction = {
        id: `txn-${generateId()}`,
        userId: user.id,
        invoiceId,
        amount,
        paymentMethodId: cardId,
        status: "completed",
        createdAt: new Date().toISOString(),
      };

      setAllTransactions((prev) => {
        const next = [...prev, transaction];
        setStoredData("mila-payment-transactions", next);
        return next;
      });

      const { id, ...txnData } = transaction;
      setDocument("payments", id, txnData).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
      emit("payment:completed", transaction);
      return transaction;
    },
    [user, emit]
  );

  const processCounterPayment = useCallback(
    (invoiceId: string, amount: number, note: string): PaymentTransaction => {
      const transaction: PaymentTransaction = {
        id: `txn-${generateId()}`,
        userId: user?.id ?? "admin",
        invoiceId,
        amount,
        paymentMethodId: "counter",
        paymentMethod: "counter",
        counterNote: note,
        status: "completed",
        createdAt: new Date().toISOString(),
      };

      setAllTransactions((prev) => {
        const next = [...prev, transaction];
        setStoredData("mila-payment-transactions", next);
        return next;
      });

      const { id, ...txnData } = transaction;
      setDocument("payments", id, txnData).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
      emit("payment:completed", transaction);
      return transaction;
    },
    [user, emit]
  );

  const getClientCards = useCallback(
    (clientId: string): CreditCard[] => {
      return allCards.filter((c) => c.userId === clientId);
    },
    [allCards]
  );

  // Firestore real-time sync
  useEffect(() => {
    const unsubs = [
      onCollectionChange<PaymentTransaction>("payments", (firestoreTxns) => {
        if (firestoreTxns.length > 0) {
          setAllTransactions((prev) => {
            const merged = new Map<string, PaymentTransaction>();
            for (const t of prev) merged.set(t.id, t);
            for (const t of firestoreTxns) merged.set(t.id, t);
            const next = Array.from(merged.values());
            setStoredData("mila-payment-transactions", next);
            return next;
          });
        }
      }),
      onCollectionChange<CreditCard>("payment-methods", (firestoreCards) => {
        if (firestoreCards.length > 0) {
          setAllCards((prev) => {
            const merged = new Map<string, CreditCard>();
            for (const c of prev) merged.set(c.id, c);
            for (const c of firestoreCards) merged.set(c.id, c);
            const next = Array.from(merged.values());
            setStoredData("mila-payment-methods", next);
            return next;
          });
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    const unsubs = [
      on("payment:completed", () => {
        setAllTransactions(getStoredData<PaymentTransaction[]>("mila-payment-transactions", []));
        setAllCards(getStoredData<CreditCard[]>("mila-payment-methods", []));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on]);

  return (
    <PaymentContext.Provider
      value={{ savedCards, transactions, addCard, removeCard, setDefaultCard, processPayment, processCounterPayment, getClientCards }}
    >
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment(): PaymentContextValue {
  const context = useContext(PaymentContext);
  if (!context) throw new Error("usePayment must be used within a PaymentProvider");
  return context;
}
