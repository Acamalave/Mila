"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import {
  CreditCard,
  Banknote,
  Loader2,
  Send,
  ShieldCheck,
  Smartphone,
  Wallet,
  Receipt,
} from "lucide-react";
import type { PaymentMethod } from "@/types";

/** Method selectable from the POS — excludes "card" because card flows
 *  through onSendRequest (gateway), not the unified counter-style handler. */
export type CounterMethod = "yappy" | "cubo" | "cash" | "counter";

interface POSPaymentSelectorProps {
  total: number;
  /**
   * Called for every non-card method (yappy / cubo / cash / counter).
   * `note` is whatever the operator typed in the contextual field
   * (reference number for Yappy/Cubo, free-form for counter, optional
   * for cash).
   */
  onPayCounter: (method: CounterMethod, note: string) => void;
  /** Card flow — sends a payment request to the client (gateway). */
  onSendRequest: () => void;
  isProcessing: boolean;
}

interface MethodMeta {
  key: PaymentMethod;
  icon: typeof CreditCard;
  label: { es: string; en: string };
  description: { es: string; en: string };
  /** Label shown above the contextual note input. Empty = no input. */
  notePrompt?: { es: string; en: string };
  notePlaceholder?: { es: string; en: string };
  noteRequired?: boolean;
}

const METHODS: MethodMeta[] = [
  {
    key: "card",
    icon: CreditCard,
    label: { es: "Tarjeta", en: "Card" },
    description: {
      es: "Cobro online vía Paguelo Fácil",
      en: "Online charge via Paguelo Fácil",
    },
  },
  {
    key: "yappy",
    icon: Smartphone,
    label: { es: "Yappy", en: "Yappy" },
    description: {
      es: "Pago móvil Banco General",
      en: "Banco General mobile payment",
    },
    notePrompt: {
      es: "Número de referencia Yappy",
      en: "Yappy reference number",
    },
    notePlaceholder: { es: "Ej: YAP-123456", en: "e.g. YAP-123456" },
    noteRequired: true,
  },
  {
    key: "cubo",
    icon: Wallet,
    label: { es: "Cubo", en: "Cubo" },
    description: { es: "Pago móvil Cubo", en: "Cubo mobile payment" },
    notePrompt: {
      es: "Número de referencia Cubo",
      en: "Cubo reference number",
    },
    notePlaceholder: { es: "Ej: CB-123456", en: "e.g. CB-123456" },
    noteRequired: true,
  },
  {
    key: "cash",
    icon: Banknote,
    label: { es: "Efectivo", en: "Cash" },
    description: { es: "Pago en efectivo", en: "Cash payment" },
    notePrompt: { es: "Notas (opcional)", en: "Notes (optional)" },
    notePlaceholder: {
      es: "Ej: pagó con $50, vuelto $5",
      en: "e.g. paid $50, change $5",
    },
  },
  {
    key: "counter",
    icon: Receipt,
    label: { es: "Otro / Mostrador", en: "Other / Counter" },
    description: {
      es: "Cheque, transferencia, etc.",
      en: "Check, transfer, etc.",
    },
    notePrompt: { es: "Detalle del pago", en: "Payment detail" },
    notePlaceholder: {
      es: "Describe el método y referencia",
      en: "Describe the method and reference",
    },
    noteRequired: true,
  },
];

export default function POSPaymentSelector({
  total,
  onPayCounter,
  onSendRequest,
  isProcessing,
}: POSPaymentSelectorProps) {
  const { language, t } = useLanguage();
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [note, setNote] = useState("");

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={40} style={{ color: "var(--color-accent)" }} />
        </motion.div>
        <p
          className="text-sm font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {t("pos", "processingPayment")}
        </p>
      </div>
    );
  }

  const selectedMeta = METHODS.find((m) => m.key === selected) ?? null;
  const requiresNote = !!selectedMeta?.noteRequired;
  const canRegister =
    selected !== null && selected !== "card" && (!requiresNote || note.trim().length > 0);

  return (
    <div className="space-y-4">
      <p
        className="text-sm font-medium"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {t("pos", "paymentMethod")}
      </p>

      {/* Method tiles — 2 cols on mobile, 3 on tablet+, 5 on wide screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {METHODS.map((m) => {
          const Icon = m.icon;
          const isActive = selected === m.key;
          return (
            <button
              key={m.key}
              onClick={() => {
                setSelected(m.key);
                // Clear note when switching method so prior input doesn't
                // bleed into a method that didn't ask for it.
                setNote("");
              }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all cursor-pointer text-center"
              style={{
                background: isActive
                  ? "var(--color-accent-subtle)"
                  : "var(--color-bg-glass)",
                border: isActive
                  ? "2px solid var(--color-border-accent)"
                  : "1px solid var(--color-border-default)",
                color: isActive
                  ? "var(--color-accent)"
                  : "var(--color-text-primary)",
                padding: isActive ? "11px" : "12px",
              }}
            >
              <Icon size={22} />
              <span className="text-xs sm:text-sm font-semibold">
                {m.label[language]}
              </span>
              <span
                className="text-[10px] leading-tight"
                style={{
                  color: isActive
                    ? "var(--color-accent)"
                    : "var(--color-text-muted)",
                }}
              >
                {m.description[language]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Contextual details + CTA per selected method */}
      <AnimatePresence mode="wait">
        {selected === "card" && (
          <motion.div
            key="card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div
              className="rounded-xl p-6 text-center space-y-4"
              style={{
                background: "var(--color-bg-glass)",
                border: "1px solid var(--color-border-default)",
              }}
            >
              <div
                className="flex items-center justify-center mx-auto"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--color-accent-subtle)",
                  border: "1px solid var(--color-border-accent)",
                }}
              >
                <Smartphone size={24} style={{ color: "var(--color-accent)" }} />
              </div>
              <div className="space-y-1">
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {language === "es"
                    ? "Solicitud de pago al cliente"
                    : "Payment request to client"}
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {language === "es"
                    ? "El cliente recibirá una notificación en su dashboard para completar el pago con su tarjeta."
                    : "The client will receive a notification on their dashboard to complete payment with their card."}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <ShieldCheck
                  size={14}
                  style={{ color: "var(--color-text-muted)" }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {t("pos", "poweredBy")} PagueloFacil
                </span>
              </div>

              <Button fullWidth size="lg" onClick={onSendRequest}>
                <Send size={16} />
                {t("pos", "sendPaymentRequest")} — {formatPrice(total)}
              </Button>
            </div>
          </motion.div>
        )}

        {selectedMeta && selected !== "card" && (
          <motion.div
            key={selected}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {selectedMeta.notePrompt && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {selectedMeta.notePrompt[language]}
                  {selectedMeta.noteRequired && (
                    <span style={{ color: "#9B4D4D" }}> *</span>
                  )}
                </label>
                {/* Compact input for reference-number style methods, textarea
                    for free-form notes. Heuristic: textarea when the
                    description suggests it. */}
                {selected === "counter" || selected === "cash" ? (
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={selectedMeta.notePlaceholder?.[language] ?? ""}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg resize-none text-sm transition-all duration-200"
                    style={{
                      background: "var(--color-bg-input)",
                      color: "var(--color-text-primary)",
                      border: "1px solid var(--color-border-default)",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-accent)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 2px var(--color-accent-glow)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--color-border-default)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={selectedMeta.notePlaceholder?.[language] ?? ""}
                    className="w-full px-4 py-3 rounded-lg text-sm transition-all duration-200"
                    style={{
                      background: "var(--color-bg-input)",
                      color: "var(--color-text-primary)",
                      border: "1px solid var(--color-border-default)",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-accent)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 2px var(--color-accent-glow)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--color-border-default)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                )}
              </div>
            )}

            <Button
              fullWidth
              size="lg"
              onClick={() => onPayCounter(selected as CounterMethod, note)}
              disabled={!canRegister}
            >
              <selectedMeta.icon size={16} />
              {t("pos", "registerPayment")} — {formatPrice(total)}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
