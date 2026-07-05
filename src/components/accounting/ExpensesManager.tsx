"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { useExpenses } from "@/providers/ExpenseProvider";
import { cn, formatPrice } from "@/lib/utils";
import { formatShortDate, localIsoDate } from "@/lib/date-utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Tag,
  DollarSign,
} from "lucide-react";
import type { Expense, ExpenseCategory } from "@/types";

const CATEGORIES: ExpenseCategory[] = [
  "rent",
  "salaries",
  "supplies",
  "utilities",
  "marketing",
  "equipment",
  "tax",
  "other",
];

const CATEGORY_LABELS: Record<ExpenseCategory, { es: string; en: string }> = {
  rent: { es: "Renta", en: "Rent" },
  salaries: { es: "Salarios", en: "Salaries" },
  supplies: { es: "Insumos", en: "Supplies" },
  utilities: { es: "Servicios", en: "Utilities" },
  marketing: { es: "Marketing", en: "Marketing" },
  equipment: { es: "Equipos", en: "Equipment" },
  tax: { es: "Impuestos", en: "Tax" },
  other: { es: "Otro", en: "Other" },
};

function todayIso() {
  return localIsoDate();
}

/**
 * Operating-expenses CRUD shared by the accountant role and the admin's
 * Contabilidad → Gastos tab. Single source of truth.
 */
export default function ExpensesManager() {
  const { language } = useLanguage();
  const { addToast } = useToast();
  const { expenses, addExpense, deleteExpense } = useExpenses();

  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "all">("all");

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<string>(todayIso());
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ description?: string; amount?: string }>({});

  const resetForm = useCallback(() => {
    setDescription("");
    setAmount("");
    setDate(todayIso());
    setCategory("other");
    setNotes("");
    setErrors({});
  }, []);

  const handleAdd = useCallback(() => {
    const next: typeof errors = {};
    if (!description.trim()) {
      next.description =
        language === "es" ? "La descripción es obligatoria" : "Description is required";
    }
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      next.amount =
        language === "es" ? "El monto debe ser mayor a 0" : "Amount must be greater than 0";
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    addExpense({
      description: description.trim(),
      amount: Math.round(parsed * 100) / 100,
      date,
      category,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
    addToast(
      language === "es" ? "Gasto registrado" : "Expense recorded",
      "success"
    );
    resetForm();
    setShowForm(false);
  }, [description, amount, date, category, notes, language, addExpense, addToast, resetForm]);

  const handleDelete = useCallback(() => {
    if (!deletingId) return;
    deleteExpense(deletingId);
    setDeletingId(null);
    addToast(
      language === "es" ? "Gasto eliminado" : "Expense deleted",
      "info"
    );
  }, [deletingId, deleteExpense, addToast, language]);

  // ── Filters + aggregates ────────────────────────────────────────────────
  const sortedExpenses = useMemo(
    () =>
      [...expenses]
        .filter((e) => (filterCategory === "all" ? true : e.category === filterCategory))
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [expenses, filterCategory]
  );

  const grandTotal = useMemo(
    () => sortedExpenses.reduce((sum, e) => sum + e.amount, 0),
    [sortedExpenses]
  );

  // Aggregated by category (for the chips)
  const totalsByCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return map;
  }, [expenses]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Title + add button */}
      <motion.div
        variants={fadeInUp}
        className="flex items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
            {language === "es" ? "Gastos" : "Expenses"}
          </h1>
          <p className="text-text-secondary mt-1">
            {language === "es"
              ? "Registra gastos operativos para que aparezcan en el resumen"
              : "Track operating expenses so they show up in the summary"}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} />
          {language === "es" ? "Nuevo gasto" : "New expense"}
        </Button>
      </motion.div>

      {/* Category filter chips */}
      <motion.div variants={fadeInUp}>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory("all")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
              filterCategory === "all"
                ? "bg-mila-gold/15 text-mila-gold border border-mila-gold/30"
                : "border border-border-default text-text-secondary hover:bg-white/5"
            )}
          >
            {language === "es" ? "Todos" : "All"} ({expenses.length})
          </button>
          {CATEGORIES.map((cat) => {
            const total = totalsByCategory.get(cat) ?? 0;
            if (total === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                  filterCategory === cat
                    ? "bg-mila-gold/15 text-mila-gold border border-mila-gold/30"
                    : "border border-border-default text-text-secondary hover:bg-white/5"
                )}
              >
                {CATEGORY_LABELS[cat][language]}{" "}
                <span className="text-text-muted">·</span>{" "}
                {formatPrice(total)}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Expenses table */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          <div className="lg:overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default text-left">
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Fecha" : "Date"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Descripción" : "Description"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider hidden sm:table-cell">
                    {language === "es" ? "Categoría" : "Category"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                    {language === "es" ? "Monto" : "Amount"}
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {sortedExpenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-text-muted"
                    >
                      <Receipt
                        size={28}
                        className="mx-auto mb-2 opacity-60"
                      />
                      <p className="text-sm">
                        {language === "es"
                          ? "Sin gastos registrados"
                          : "No expenses recorded"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedExpenses.map((e: Expense) => (
                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-xs text-text-secondary whitespace-nowrap">
                        {formatShortDate(e.date, language)}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-sm text-text-primary">
                        <p className="font-medium">{e.description}</p>
                        {e.notes && (
                          <p className="text-[11px] text-text-muted mt-0.5">{e.notes}</p>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-xs text-text-secondary hidden sm:table-cell">
                        {CATEGORY_LABELS[e.category][language]}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-sm font-medium text-text-primary text-right tabular-nums whitespace-nowrap">
                        {formatPrice(e.amount)}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-3 text-right">
                        <button
                          onClick={() => setDeletingId(e.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                          title={language === "es" ? "Eliminar" : "Delete"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {sortedExpenses.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border-accent bg-accent-subtle">
                    <td
                      colSpan={3}
                      className="px-3 sm:px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary"
                    >
                      Total
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-base font-bold text-mila-gold text-right tabular-nums">
                      {formatPrice(grandTotal)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </motion.div>

      {/* New expense modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title={language === "es" ? "Nuevo gasto" : "New expense"}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={language === "es" ? "Descripción *" : "Description *"}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors((p) => ({ ...p, description: undefined }));
            }}
            placeholder={language === "es" ? "Renta local enero" : "January office rent"}
            error={errors.description}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                <DollarSign size={12} className="inline mr-1" />
                {language === "es" ? "Monto (USD) *" : "Amount (USD) *"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors((p) => ({ ...p, amount: undefined }));
                }}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-lg text-sm"
                style={{
                  background: "var(--color-bg-input)",
                  color: "var(--color-text-primary)",
                  border: errors.amount
                    ? "1px solid #9B4D4D"
                    : "1px solid var(--color-border-default)",
                  outline: "none",
                }}
              />
              {errors.amount && (
                <p className="mt-1 text-xs" style={{ color: "#9B4D4D" }}>{errors.amount}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                <Calendar size={12} className="inline mr-1" />
                {language === "es" ? "Fecha *" : "Date *"}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={todayIso()}
                className="w-full px-4 py-3 rounded-lg text-sm"
                style={{
                  background: "var(--color-bg-input)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border-default)",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
              <Tag size={12} className="inline mr-1" />
              {language === "es" ? "Categoría" : "Category"}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-4 py-3 rounded-lg text-sm"
              style={{
                background: "var(--color-bg-input)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-default)",
                outline: "none",
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c][language]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
              {language === "es" ? "Notas (opcional)" : "Notes (optional)"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={language === "es" ? "Detalles adicionales..." : "Additional details..."}
              className="w-full px-4 py-3 rounded-lg text-sm resize-none"
              style={{
                background: "var(--color-bg-input)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-default)",
                outline: "none",
              }}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              {language === "es" ? "Cancelar" : "Cancel"}
            </Button>
            <Button onClick={handleAdd}>
              {language === "es" ? "Guardar" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title={language === "es" ? "Eliminar gasto" : "Delete expense"}
        message={
          language === "es"
            ? "¿Seguro que querés eliminar este gasto? Esta acción no se puede deshacer."
            : "Are you sure you want to delete this expense? This cannot be undone."
        }
        confirmLabel={language === "es" ? "Sí, eliminar" : "Yes, delete"}
        cancelLabel={language === "es" ? "Cancelar" : "Cancel"}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </motion.div>
  );
}
