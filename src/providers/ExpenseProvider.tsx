"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Expense } from "@/types";
import { generateId, getStoredData, setStoredData } from "@/lib/utils";
import {
  setDocument,
  deleteDocument,
  onCollectionChange,
} from "@/lib/firestore";

interface ExpenseContextValue {
  expenses: Expense[];
  addExpense: (data: Omit<Expense, "id" | "createdAt">) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  /** Expenses whose `date` falls inside [start, end] inclusive. */
  expensesInRange: (start: string, end: string) => Expense[];
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

const STORAGE_KEY = "mila-expenses";

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    getStoredData<Expense[]>(STORAGE_KEY, [])
  );

  const persist = useCallback((next: Expense[]) => {
    setStoredData(STORAGE_KEY, next);
  }, []);

  // Real-time sync with Firestore. Same merge pattern other providers use.
  useEffect(() => {
    const unsub = onCollectionChange<Expense>("expenses", (firestoreExpenses) => {
      setExpenses((prev) => {
        const merged = new Map<string, Expense>();
        for (const e of prev) merged.set(e.id, e);
        for (const e of firestoreExpenses) merged.set(e.id, e);
        const next = Array.from(merged.values()).sort(
          (a, b) => (b.date ?? "").localeCompare(a.date ?? "")
        );
        persist(next);
        return next;
      });
    });
    return unsub;
  }, [persist]);

  const addExpense = useCallback(
    (data: Omit<Expense, "id" | "createdAt">): Expense => {
      const expense: Expense = {
        ...data,
        id: `exp-${generateId()}`,
        createdAt: new Date().toISOString(),
      };
      setExpenses((prev) => {
        const next = [expense, ...prev];
        persist(next);
        return next;
      });
      const { id, ...payload } = expense;
      setDocument("expenses", id, payload).catch((err) =>
        console.warn("[Expenses] Firestore sync failed:", err)
      );
      return expense;
    },
    [persist]
  );

  const updateExpense = useCallback(
    (id: string, updates: Partial<Expense>) => {
      setExpenses((prev) => {
        const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
        persist(next);
        return next;
      });
      const clean = { ...updates };
      delete (clean as { id?: string }).id;
      setDocument(
        "expenses",
        id,
        clean as Record<string, unknown>
      ).catch((err) => console.warn("[Expenses] Firestore sync failed:", err));
    },
    [persist]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      setExpenses((prev) => {
        const next = prev.filter((e) => e.id !== id);
        persist(next);
        return next;
      });
      deleteDocument("expenses", id).catch((err) =>
        console.warn("[Expenses] Firestore delete failed:", err)
      );
    },
    [persist]
  );

  const expensesInRange = useCallback(
    (start: string, end: string): Expense[] =>
      expenses.filter((e) => e.date >= start && e.date <= end),
    [expenses]
  );

  const value = useMemo(
    () => ({
      expenses,
      addExpense,
      updateExpense,
      deleteExpense,
      expensesInRange,
    }),
    [expenses, addExpense, updateExpense, deleteExpense, expensesInRange]
  );

  return (
    <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
  );
}

export function useExpenses(): ExpenseContextValue {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error("useExpenses must be used within an ExpenseProvider");
  return ctx;
}
