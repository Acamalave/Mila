"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, CreditCard, ArrowLeft, Plus, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import CreditCardForm, { type CardFormData } from "@/components/payment/CreditCardForm";
import { usePayment, detectCardBrand, type CardPaymentDetails } from "@/providers/PaymentProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { XCircle, RefreshCw } from "lucide-react";
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
  onDecline?: () => void;
}

type PaymentStep = "invoice" | "new-card" | "processing" | "success" | "failed";

const BRAND_COLORS: Record<string, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  amex: "#006FCF",
  discover: "#FF6600",
  unknown: "var(--color-text-muted)",
};

const BRAND_LABELS: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
  unknown: "CARD",
};

export default function PaymentModal({
  isOpen,
  onClose,
  invoice,
  onPaymentComplete,
  onDecline,
}: PaymentModalProps) {
  const { savedCards, addCard, removeCard, processPayment } = usePayment();
  const { markAsPaid, markAsDeclined } = useInvoices();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useToast();

  const [step, setStep] = useState<PaymentStep>("invoice");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [wantsNewCard, setWantsNewCard] = useState(false);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idempotencyKeyRef = useRef<string>("");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      const defaultCard = savedCards.find((c) => c.isDefault);
      setSelectedCardId(defaultCard?.id ?? savedCards[0]?.id ?? null);
      setStep("invoice");
      setIsProcessing(false);
      setWantsNewCard(false);
      // Generate a fresh idempotency key per modal open
      idempotencyKeyRef.current = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [isOpen, savedCards]);

  const handleProcessPayment = useCallback(
    async (cardId: string, saveCardData?: CardFormData) => {
      if (!invoice || !user) {
        addToast(t("payment", "paymentFailed"), "error");
        return;
      }

      // Prevent double-submission
      if (isProcessing) return;

      // Capture values before async operations in case invoice becomes null
      const invoiceId = invoice.id;
      const invoiceAmount = invoice.amount;

      setStep("processing");
      setIsProcessing(true);

      try {
        // Build card details for the payment gateway
        const cardDetailsForGateway: CardPaymentDetails | undefined = saveCardData
          ? {
              cardNumber: saveCardData.cardNumber,
              cardExpMonth: saveCardData.expiryMonth,
              cardExpYear: saveCardData.expiryYear,
              cardCvv: saveCardData.cvv,
              cardholderName: saveCardData.cardholderName,
            }
          : undefined;

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

        const transaction = await processPayment(
          invoiceId,
          cardId,
          invoiceAmount,
          cardDetailsForGateway,
          idempotencyKeyRef.current
        );
        markAsPaid(invoiceId, transaction.id);

        setStep("success");
        addToast(t("payment", "paymentSuccessful"), "success");
        onPaymentComplete?.();

        autoCloseTimerRef.current = setTimeout(() => {
          onClose();
        }, 2000);
      } catch {
        setStep("failed");
        setIsProcessing(false);
      }
    },
    [invoice, user, savedCards.length, addCard, processPayment, markAsPaid, addToast, t, onPaymentComplete, onClose]
  );

  const handlePayFromInvoice = useCallback(() => {
    // Always collect full card details — Paguelo Fácil doesn't tokenize saved cards,
    // so we can't charge without the full card number and CVV.
    setStep("new-card");
  }, []);

  const handleNewCardSubmit = useCallback(
    (data: CardFormData) => {
      const tempCardId = `temp-${Date.now()}`;
      handleProcessPayment(tempCardId, data);
    },
    [handleProcessPayment]
  );

  const handleDecline = useCallback(() => {
    if (invoice) {
      markAsDeclined(invoice.id);
    }
    onDecline?.();
    onClose();
  }, [invoice, markAsDeclined, onDecline, onClose]);

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
      size="md"
    >
      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════════
            INVOICE DETAIL SCREEN
            ═══════════════════════════════════════════ */}
        {step === "invoice" && (
          <motion.div
            key="invoice"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Editorial header */}
            <div className="text-center mb-6">
              <div
                style={{
                  width: 40,
                  height: 1,
                  background: "var(--gradient-accent-h)",
                  margin: "0 auto 16px",
                }}
              />
              <h2
                style={{
                  fontFamily: "var(--font-accent)",
                  fontSize: "clamp(28px, 6vw, 38px)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "var(--color-text-primary)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                  margin: 0,
                }}
              >
                {language === "es" ? "Detalle de Factura" : "Invoice Detail"}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--color-text-muted)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginTop: 8,
                }}
              >
                {invoice.id}
              </p>
            </div>

            {/* Line-item breakdown */}
            <div
              style={{
                background: "var(--color-bg-glass)",
                border: "1px solid var(--color-border-default)",
                borderRadius: 16,
                padding: "20px",
                marginBottom: 20,
              }}
            >
              {invoice.items && invoice.items.length > 0 ? (
                <>
                  {/* Items header */}
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--color-text-muted)",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    {language === "es" ? "Servicios / Productos" : "Services / Products"}
                  </p>

                  {/* Item rows */}
                  {invoice.items.map((item, i) => (
                    <div
                      key={item.id || i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom:
                          i < invoice.items!.length - 1
                            ? "1px solid var(--color-border-subtle)"
                            : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: 14,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {typeof item.name === "object" ? (item.name as Record<string, string>)[language] || (item.name as Record<string, string>).en : item.name}
                        </span>
                        {item.quantity > 1 && (
                          <span
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: 10,
                              fontWeight: 600,
                              color: "var(--color-accent)",
                              background: "var(--color-accent-subtle)",
                              padding: "2px 8px",
                              borderRadius: 10,
                              letterSpacing: "0.05em",
                            }}
                          >
                            x{item.quantity}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 14,
                          fontWeight: 500,
                          color: "var(--color-accent)",
                        }}
                      >
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}

                  {/* Subtotal / Tax */}
                  {(invoice.subtotal || invoice.taxAmount) && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border-subtle)" }}>
                      {invoice.subtotal && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                            Subtotal
                          </span>
                          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                            {formatPrice(invoice.subtotal)}
                          </span>
                        </div>
                      )}
                      {invoice.taxAmount && invoice.taxAmount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                            {language === "es" ? "Impuesto" : "Tax"}
                            {invoice.taxRate ? ` (${invoice.taxRate}%)` : ""}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                            {formatPrice(invoice.taxAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dashed divider */}
                  <div
                    style={{
                      borderTop: "2px dashed var(--color-border-default)",
                      margin: "16px 0",
                    }}
                  />

                  {/* Total */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--color-text-muted)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      Total
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-accent)",
                        fontSize: 32,
                        fontWeight: 400,
                        color: "var(--color-text-primary)",
                        lineHeight: 1,
                      }}
                    >
                      {formatPrice(invoice.amount)}
                    </span>
                  </div>
                </>
              ) : (
                /* Fallback for invoices without items */
                <>
                  {descriptionText && (
                    <p
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 14,
                        color: "var(--color-text-secondary)",
                        marginBottom: 12,
                      }}
                    >
                      {descriptionText}
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {new Date(invoice.date).toLocaleDateString(
                        language === "es" ? "es-ES" : "en-US",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-accent)",
                        fontSize: 32,
                        fontWeight: 400,
                        color: "var(--color-text-primary)",
                        lineHeight: 1,
                      }}
                    >
                      {formatPrice(invoice.amount)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Payment method section */}
            {savedCards.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--color-text-muted)",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  {language === "es" ? "Método de Pago" : "Payment Method"}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {savedCards.map((card) => {
                    const isSelected = !wantsNewCard && selectedCardId === card.id;
                    return (
                      <motion.button
                        key={card.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          setSelectedCardId(card.id);
                          setWantsNewCard(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: isSelected ? "11px 14px" : "12px 15px",
                          borderRadius: 12,
                          background: isSelected ? "var(--color-bg-glass-selected)" : "var(--color-bg-glass)",
                          border: isSelected ? "2px solid var(--color-accent)" : "1px solid var(--color-border-default)",
                          boxShadow: isSelected ? "var(--shadow-glow)" : "none",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          width: "100%",
                          textAlign: "left",
                        }}
                      >
                        {/* Brand badge */}
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 9,
                            fontWeight: 700,
                            color: BRAND_COLORS[card.cardBrand] || BRAND_COLORS.unknown,
                            background: "var(--color-bg-glass-hover)",
                            padding: "4px 8px",
                            borderRadius: 6,
                            letterSpacing: "0.05em",
                            minWidth: 40,
                            textAlign: "center",
                          }}
                        >
                          {BRAND_LABELS[card.cardBrand] || BRAND_LABELS.unknown}
                        </span>

                        {/* Card info */}
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 13,
                            color: "var(--color-text-primary)",
                            flex: 1,
                          }}
                        >
                          ···· {card.lastFourDigits}
                        </span>

                        {/* Expiry */}
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-muted)",
                          }}
                        >
                          {card.expiryMonth}/{card.expiryYear}
                        </span>

                        {/* Selection indicator */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          >
                            <Check size={14} style={{ color: "var(--color-accent)" }} />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}

                  {/* Add new method pill */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setWantsNewCard(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: wantsNewCard ? "11px 14px" : "12px 15px",
                      borderRadius: 12,
                      background: wantsNewCard ? "var(--color-bg-glass-selected)" : "transparent",
                      border: wantsNewCard
                        ? "2px solid var(--color-accent)"
                        : "2px dashed var(--color-border-default)",
                      boxShadow: wantsNewCard ? "var(--shadow-glow)" : "none",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      width: "100%",
                    }}
                  >
                    <Plus size={14} style={{ color: wantsNewCard ? "var(--color-accent)" : "var(--color-text-muted)" }} />
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 12,
                        fontWeight: 500,
                        color: wantsNewCard ? "var(--color-accent)" : "var(--color-text-muted)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {language === "es" ? "Agregar método de pago" : "Add payment method"}
                    </span>
                  </motion.button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Pay button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePayFromInvoice}
                disabled={!wantsNewCard && !selectedCardId && savedCards.length > 0}
                style={{
                  width: "100%",
                  height: 52,
                  borderRadius: 12,
                  background: "var(--gradient-accent)",
                  boxShadow: "var(--shadow-glow)",
                  border: "none",
                  color: "var(--color-text-inverse)",
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.3s ease",
                  opacity: (!wantsNewCard && !selectedCardId && savedCards.length > 0) ? 0.5 : 1,
                }}
              >
                <CreditCard size={16} />
                {t("payment", "payAmount")} {formatPrice(invoice.amount)}
              </motion.button>

              {/* Decline button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDecline}
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 12,
                  background: "transparent",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.3s ease",
                }}
              >
                <X size={14} />
                {language === "es" ? "Rechazar" : "Decline"}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════
            NEW CARD FORM
            ═══════════════════════════════════════════ */}
        {step === "new-card" && (
          <motion.div
            key="new-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Back button */}
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setStep("invoice")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 16,
                background: "none",
                border: "none",
                color: "var(--color-accent)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "var(--font-display)",
              }}
            >
              <ArrowLeft size={14} />
              {language === "es" ? "Volver al detalle" : "Back to invoice"}
            </motion.button>

            <CreditCardForm
              onSubmit={handleNewCardSubmit}
              onCancel={() => setStep("invoice")}
              isProcessing={isProcessing}
              showSaveOption={true}
            />
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════
            PROCESSING STATE
            ═══════════════════════════════════════════ */}
        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="relative mb-8">
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
              <div className="absolute inset-0 flex items-center justify-center">
                <CreditCard size={20} style={{ color: "var(--color-accent)" }} />
              </div>
            </div>
            <p
              style={{
                fontFamily: "var(--font-accent)",
                fontSize: "clamp(20px, 4vw, 26px)",
                fontWeight: 400,
                fontStyle: "italic",
                color: "var(--color-text-primary)",
                lineHeight: 1.2,
                textAlign: "center",
              }}
            >
              {language === "es" ? "Procesando tu pago" : "Processing your payment"}
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginTop: 8,
              }}
            >
              {formatPrice(invoice.amount)}
            </p>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════
            SUCCESS STATE
            ═══════════════════════════════════════════ */}
        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center py-16"
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

            {/* Label */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              {t("payment", "paymentSuccessful")}
            </motion.p>

            {/* Amount in editorial style */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                fontFamily: "var(--font-accent)",
                fontSize: 36,
                fontWeight: 400,
                color: "#22c55e",
                marginTop: 4,
                lineHeight: 1.1,
              }}
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
        {/* ═══════════════════════════════════════════
            FAILED / DECLINED BY GATEWAY STATE
            ═══════════════════════════════════════════ */}
        {step === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center py-12 gap-6"
          >
            {/* Error icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              className="flex items-center justify-center"
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.1)",
                border: "2px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <XCircle size={32} style={{ color: "#ef4444" }} strokeWidth={2} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-center space-y-2"
            >
              <p
                style={{
                  fontFamily: "var(--font-accent)",
                  fontSize: "clamp(20px, 4vw, 26px)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "var(--color-text-primary)",
                }}
              >
                {language === "es" ? "Pago rechazado" : "Payment declined"}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  color: "var(--color-text-muted)",
                  letterSpacing: "0.05em",
                }}
              >
                {language === "es"
                  ? "Tu banco rechazó el cargo. Puedes intentar con otra tarjeta."
                  : "Your bank declined the charge. You can try with a different card."}
              </p>
            </motion.div>

            {/* Retry button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex flex-col gap-3 w-full"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setStep("invoice");
                  setIsProcessing(false);
                }}
                style={{
                  width: "100%",
                  height: 52,
                  borderRadius: 12,
                  background: "var(--gradient-accent)",
                  boxShadow: "var(--shadow-glow)",
                  border: "none",
                  color: "var(--color-text-inverse)",
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <RefreshCw size={15} />
                {language === "es" ? "Intentar de nuevo" : "Try again"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={onClose}
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 12,
                  background: "transparent",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  cursor: "pointer",
                }}
              >
                {language === "es" ? "Cancelar" : "Cancel"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
