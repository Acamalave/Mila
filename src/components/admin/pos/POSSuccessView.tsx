"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { Check, FileText, Plus, StickyNote, Send } from "lucide-react";
import type { PaymentMethod } from "@/types";

interface POSSuccessViewProps {
  total: number;
  clientName: string;
  paymentMethod: PaymentMethod;
  onNewSale: () => void;
  onViewInvoice?: () => void;
  /**
   * Persist a private staff-only note about this client. Called when the
   * operator hits "Guardar nota" on the success view. Returning a
   * Promise<void> isn't required — fire-and-forget is fine, the parent
   * handles persistence + toast.
   */
  onSaveNote?: (text: string) => void;
}

const METHOD_LABEL: Record<PaymentMethod, { es: string; en: string }> = {
  card: { es: "Pagado con tarjeta", en: "Paid by card" },
  yappy: { es: "Pagado con Yappy", en: "Paid with Yappy" },
  cubo: { es: "Pagado con Cubo", en: "Paid with Cubo" },
  cash: { es: "Pagado en efectivo", en: "Paid in cash" },
  counter: { es: "Pago en mostrador", en: "Counter payment" },
};

export default function POSSuccessView({
  total,
  clientName,
  paymentMethod,
  onNewSale,
  onViewInvoice,
  onSaveNote,
}: POSSuccessViewProps) {
  const { language, t } = useLanguage();
  const [showContent, setShowContent] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveNote = () => {
    if (!onSaveNote || !noteText.trim()) return;
    onSaveNote(noteText.trim());
    setNoteSaved(true);
    setNoteText("");
    setNoteOpen(false);
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      {/* Animated check */}
      <div className="relative">
        {/* Pulse ring */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeOut",
          }}
          className="absolute inset-0 rounded-full"
          style={{ background: "var(--color-accent)" }}
        />
        {/* Circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1,
          }}
          className="relative flex items-center justify-center"
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--color-accent)",
          }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              delay: 0.3,
            }}
          >
            <Check size={36} color="white" strokeWidth={3} />
          </motion.div>
        </motion.div>
      </div>

      {/* Success text */}
      {showContent && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h3
            className="text-xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {t("pos", "saleComplete")}
          </h3>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {clientName}
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--color-accent)" }}
          >
            {formatPrice(total)}
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            {(METHOD_LABEL[paymentMethod] ?? METHOD_LABEL.counter)[language]}
          </p>
        </motion.div>
      )}

      {/* Internal note about the client (admin-only context) */}
      {showContent && onSaveNote && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full max-w-md"
        >
          <AnimatePresence mode="wait" initial={false}>
            {!noteOpen && !noteSaved && (
              <motion.button
                key="open"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setNoteOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                style={{
                  background: "var(--color-bg-glass)",
                  border: "1px dashed var(--color-border-default)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <StickyNote size={14} />
                {language === "es"
                  ? "Agregar nota interna sobre el cliente"
                  : "Add internal note about the client"}
              </motion.button>
            )}

            {noteOpen && (
              <motion.div
                key="open-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    background: "var(--color-bg-glass)",
                    border: "1px solid var(--color-border-default)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <StickyNote
                      size={14}
                      style={{ color: "var(--color-accent)" }}
                    />
                    <p
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {language === "es"
                        ? "Nota interna (solo admin)"
                        : "Internal note (admin only)"}
                    </p>
                  </div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    autoFocus
                    rows={3}
                    placeholder={
                      language === "es"
                        ? "Ej: prefiere shampoo sin sulfato, alérgica al perfume X, viene desde Costa del Este…"
                        : "e.g. prefers sulfate-free shampoo, allergic to fragrance X, comes from Costa del Este…"
                    }
                    className="w-full px-3 py-2 rounded-lg resize-none text-sm"
                    style={{
                      background: "var(--color-bg-input)",
                      color: "var(--color-text-primary)",
                      border: "1px solid var(--color-border-default)",
                      outline: "none",
                    }}
                    onKeyDown={(e) => {
                      // Cmd/Ctrl + Enter saves quickly
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleSaveNote();
                      }
                    }}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setNoteOpen(false);
                        setNoteText("");
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    >
                      {language === "es" ? "Cancelar" : "Cancel"}
                    </button>
                    <Button
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={!noteText.trim()}
                    >
                      <Send size={12} />
                      {language === "es" ? "Guardar nota" : "Save note"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {noteSaved && (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: "rgba(34, 197, 94, 0.1)",
                  color: "#22c55e",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                }}
              >
                <Check size={14} />
                {language === "es"
                  ? "Nota guardada en el perfil del cliente"
                  : "Note saved to client profile"}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Actions */}
      {showContent && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-3 w-full max-w-xs"
        >
          <Button fullWidth onClick={onNewSale}>
            <Plus size={16} />
            {t("pos", "newSale")}
          </Button>
          {onViewInvoice && (
            <Button variant="ghost" fullWidth onClick={onViewInvoice}>
              <FileText size={16} />
              {t("pos", "viewInvoice")}
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
