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

interface PaymentContextValue {
  savedCards: CreditCard[];
  transactions: PaymentTransaction[];
  addCard: (card: Omit<CreditCard, "id" | "createdAt">) => void;
  removeCard: (cardId: string) => void;
  setDefaultCard: (cardId: string) => void;
  processPayment: (invoiceId: string, cardId: string, amount: number) => PaymentTransaction;
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
    },
    []
  );

  const removeCard = useCallback((cardId: string) => {
    setAllCards((prev) => {
      const next = prev.filter((c) => c.id !== cardId);
      setStoredData("mila-payment-methods", next);
      return next;
    });
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
    (invoiceId: string, cardId: string, amount: number): PaymentTransaction => {
      if (!user) throw new Error("User must be authenticated to process payment");

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

      emit("payment:completed", transaction);
      return transaction;
    },
    [user, emit]
  );

  useEffect(() => {
    const unsubs = [
      on("payment:completed", () => {
        setAllTransactions(getStoredData<PaymentTransaction[]>("mila-payment-transactions", []));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on]);

  return (
    <PaymentContext.Provider
      value={{ savedCards, transactions, addCard, removeCard, setDefaultCard, processPayment }}
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
