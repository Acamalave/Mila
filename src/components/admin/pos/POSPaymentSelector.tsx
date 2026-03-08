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
} from "lucide-react";

interface POSPaymentSelectorProps {
  total: number;
  onPayCounter: (note: string) => void;
  onSendRequest: () => void;
  isProcessing: boolean;
}

export default function POSPaymentSelector({
  total,
  onPayCounter,
  onSendRequest,
  isProcessing,
}: POSPaymentSelectorProps) {
  const { language, t } = useLanguage();
  const [method, setMethod] = useState<"card" | "counter" | null>(null);
  const [counterNote, setCounterNote] = useState("");

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
        <div className="flex items-center gap-2 mt-2">
          <ShieldCheck size={14} style={{ color: "var(--color-text-muted)" }} />
          <span
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            {t("pos", "poweredBy")} PagueloFacil
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Method tabs */}
      <p
        className="text-sm font-medium"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {t("pos", "paymentMethod")}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Card option */}
        <button
          onClick={() => setMethod("card")}
          className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all cursor-pointer"
          style={{
            background:
              method === "card"
                ? "var(--color-accent-subtle)"
                : "var(--color-bg-glass)",
            border:
              method === "card"
                ? "2px solid var(--color-border-accent)"
                : "1px solid var(--color-border-default)",
            color:
              method === "card"
                ? "var(--color-accent)"
                : "var(--color-text-primary)",
            padding: method === "card" ? "15px" : "16px",
          }}
        >
          <CreditCard size={24} />
          <span className="text-sm font-semibold">{t("pos", "card")}</span>
          <span
            className="text-[11px] text-center leading-tight"
            style={{
              color:
                method === "card"
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)",
            }}
          >
            {t("pos", "cardDescription")}
          </span>
        </button>

        {/* Counter option */}
        <button
          onClick={() => setMethod("counter")}
          className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all cursor-pointer"
          style={{
            background:
              method === "counter"
                ? "var(--color-accent-subtle)"
                : "var(--color-bg-glass)",
            border:
              method === "counter"
                ? "2px solid var(--color-border-accent)"
                : "1px solid var(--color-border-default)",
            color:
              method === "counter"
                ? "var(--color-accent)"
                : "var(--color-text-primary)",
            padding: method === "counter" ? "15px" : "16px",
          }}
        >
          <Banknote size={24} />
          <span className="text-sm font-semibold">{t("pos", "counter")}</span>
          <span
            className="text-[11px] text-center leading-tight"
            style={{
              color:
                method === "counter"
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)",
            }}
          >
            {t("pos", "counterDescription")}
          </span>
        </button>
      </div>

      {/* Payment details */}
      <AnimatePresence mode="wait">
        {method === "card" && (
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
                <Smartphone
                  size={24}
                  style={{ color: "var(--color-accent)" }}
                />
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
                    ? "El cliente recibirá una notificación en su dashboard para completar el pago con su tarjeta registrada o agregar una nueva."
                    : "The client will receive a notification on their dashboard to complete payment with their saved card or add a new one."}
                </p>
              </div>

              {/* PagueloFacil branding */}
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

        {method === "counter" && (
          <motion.div
            key="counter"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t("pos", "paymentDetails")}
              </label>
              <textarea
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
                placeholder={t("pos", "paymentDetailsPlaceholder")}
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
            </div>

            <Button
              fullWidth
              size="lg"
              onClick={() => onPayCounter(counterNote)}
              disabled={!counterNote.trim()}
            >
              <Banknote size={16} />
              {t("pos", "registerPayment")} — {formatPrice(total)}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
