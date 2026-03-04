"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, CreditCard, ArrowLeft } from "lucide-react";
import Modal from "@/components/ui/Modal";
import SavedCardSelector from "@/components/payment/SavedCardSelector";
import CreditCardForm, { type CardFormData } from "@/components/payment/CreditCardForm";
import { usePayment, detectCardBrand } from "@/providers/PaymentProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { formatPrice } from "@/lib/utils";
import type { Invoice } from "@/types";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onPaymentComplete?: () => void;
}

type PaymentStep = "select" | "new-card" | "processing" | "success";

export default function PaymentModal({
  isOpen,
  onClose,
  invoice,
  onPaymentComplete,
}: PaymentModalProps) {
  const { savedCards, addCard, removeCard, processPayment } = usePayment();
  const { markAsPaid } = useInvoices();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useToast();

  const [step, setStep] = useState<PaymentStep>("select");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      const defaultCard = savedCards.find((c) => c.isDefault);
      setSelectedCardId(defaultCard?.id ?? savedCards[0]?.id ?? null);
      setStep(savedCards.length > 0 ? "select" : "new-card");
      setIsProcessing(false);
    }
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [isOpen, savedCards]);

  const handleProcessPayment = useCallback(
    async (cardId: string, saveCardData?: CardFormData) => {
      if (!invoice || !user) return;

      setStep("processing");
      setIsProcessing(true);

      // Simulated processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      try {
        // If saving a new card, add it first
        if (saveCardData?.saveCard) {
          addCard({
            userId: user.id,
            cardholderName: saveCardData.cardholderName,
            lastFourDigits: saveCardData.cardNumber.slice(-4),
            expiryMonth: saveCardData.expiryMonth,
            expiryYear: saveCardData.expiryYear,
            cardBrand: detectCardBrand(saveCardData.cardNumber),
            isDefault: savedCards.length === 0,
          });
        }

        const transaction = processPayment(invoice.id, cardId, invoice.amount);
        markAsPaid(invoice.id, transaction.id);

        setStep("success");
        addToast(t("payment", "paymentSuccessful"), "success");
        onPaymentComplete?.();

        // Auto-close after 2s
        autoCloseTimerRef.current = setTimeout(() => {
          onClose();
        }, 2000);
      } catch {
        setStep("select");
        setIsProcessing(false);
        addToast(t("payment", "paymentFailed"), "error");
      }
    },
    [invoice, user, savedCards.length, addCard, processPayment, markAsPaid, addToast, t, onPaymentComplete, onClose]
  );

  const handleSavedCardPay = useCallback(() => {
    if (!selectedCardId) return;
    handleProcessPayment(selectedCardId);
  }, [selectedCardId, handleProcessPayment]);

  const handleNewCardSubmit = useCallback(
    (data: CardFormData) => {
      // Use a temporary card ID for new-card payment
      const tempCardId = `temp-${Date.now()}`;
      handleProcessPayment(tempCardId, data);
    },
    [handleProcessPayment]
  );

  if (!invoice) return null;

  const descriptionText =
    invoice.description
      ? typeof invoice.description === "string"
        ? invoice.description
        : invoice.description[language] || invoice.description.en
      : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === "processing" ? () => {} : onClose}
      title={step === "success" ? undefined : t("payment", "checkoutTitle")}
      size="md"
    >
      <AnimatePresence mode="wait">
        {/* Processing State */}
        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-12"
          >
            {/* Spinner */}
            <div className="relative mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: "3px solid var(--color-border-default)",
                  borderTopColor: "var(--color-accent)",
                }}
              />
              <div
                className="absolute inset-0 flex items-center justify-center"
              >
                <CreditCard size={20} style={{ color: "var(--color-accent)" }} />
              </div>
            </div>
            <p
              className="text-base font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t("payment", "processing")}
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              {formatPrice(invoice.amount)}
            </p>
          </motion.div>
        )}

        {/* Success State */}
        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center py-12"
          >
            {/* Success checkmark */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.1,
              }}
              className="mb-6 flex items-center justify-center"
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.1)",
                border: "2px solid rgba(34, 197, 94, 0.3)",
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.25,
                }}
              >
                <Check size={32} style={{ color: "#22c55e" }} strokeWidth={3} />
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-semibold"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-text-primary)",
              }}
            >
              {t("payment", "paymentSuccessful")}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-bold mt-2"
              style={{ color: "#22c55e" }}
            >
              {formatPrice(invoice.amount)}
            </motion.p>

            {/* Success pulse ring */}
            <motion.div
              className="absolute"
              initial={{ width: 72, height: 72, opacity: 0.5 }}
              animate={{ width: 120, height: 120, opacity: 0 }}
              transition={{ duration: 1.5, delay: 0.3 }}
              style={{
                borderRadius: "50%",
                border: "2px solid rgba(34, 197, 94, 0.3)",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -80%)",
                pointerEvents: "none",
              }}
            />
          </motion.div>
        )}

        {/* Select / New Card States */}
        {(step === "select" || step === "new-card") && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Invoice summary */}
            <div
              className="rounded-xl p-4 mb-5"
              style={{
                background: "var(--color-bg-glass)",
                border: "1px solid var(--color-border-default)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs uppercase tracking-wider font-medium"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {t("payment", "orderSummary")}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {invoice.id}
                </span>
              </div>
              {descriptionText && (
                <p
                  className="text-sm mb-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {descriptionText}
                </p>
              )}
              <div className="flex items-end justify-between">
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {new Date(invoice.date).toLocaleDateString(
                    language === "es" ? "es-ES" : "en-US",
                    { year: "numeric", month: "long", day: "numeric" }
                  )}
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {formatPrice(invoice.amount)}
                </span>
              </div>
            </div>

            {/* Card Selection / New Card form */}
            {step === "select" && savedCards.length > 0 ? (
              <>
                <SavedCardSelector
                  cards={savedCards}
                  selectedCardId={selectedCardId}
                  onSelect={setSelectedCardId}
                  onAddNew={() => setStep("new-card")}
                  onRemoveCard={removeCard}
                />

                {/* Pay button */}
                <motion.button
                  whileHover={!selectedCardId ? {} : { scale: 1.02 }}
                  whileTap={!selectedCardId ? {} : { scale: 0.98 }}
                  onClick={handleSavedCardPay}
                  disabled={!selectedCardId}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm mt-5 flex items-center justify-center gap-2"
                  style={{
                    background: selectedCardId ? "var(--gradient-accent)" : "var(--color-bg-glass)",
                    color: selectedCardId ? "var(--color-text-inverse)" : "var(--color-text-muted)",
                    boxShadow: selectedCardId ? "var(--shadow-glow)" : "none",
                    border: selectedCardId ? "none" : "1px solid var(--color-border-default)",
                    cursor: selectedCardId ? "pointer" : "not-allowed",
                    transition: "all 0.3s ease",
                  }}
                >
                  <CreditCard size={16} />
                  {t("payment", "payAmount")} {formatPrice(invoice.amount)}
                </motion.button>
              </>
            ) : (
              <>
                {/* Back to saved cards button (if there are saved cards) */}
                {savedCards.length > 0 && step === "new-card" && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setStep("select")}
                    className="flex items-center gap-2 mb-4"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-accent)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    <ArrowLeft size={14} />
                    {t("payment", "useSavedCard")}
                  </motion.button>
                )}

                <CreditCardForm
                  onSubmit={handleNewCardSubmit}
                  onCancel={savedCards.length > 0 ? () => setStep("select") : onClose}
                  isProcessing={isProcessing}
                  showSaveOption={true}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
