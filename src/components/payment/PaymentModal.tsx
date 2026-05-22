"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, CreditCard, ArrowLeft, X, XCircle, RefreshCw, ShieldCheck, Mail } from "lucide-react";
import Modal from "@/components/ui/Modal";
import CreditCardForm, { type CardFormData } from "@/components/payment/CreditCardForm";
import { usePayment, type CardPaymentDetails } from "@/providers/PaymentProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { formatPrice } from "@/lib/utils";
import type { Invoice } from "@/types";

/** Same routability check the server uses — keep these in sync. */
function isValidEmail(raw: string | undefined | null): boolean {
  const e = (raw ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e)) return false;
  if (/\.(local|invalid|test|example)$/.test(e)) return false;
  return true;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onPaymentComplete?: () => void;
  onDecline?: () => void;
}

type PaymentStep = "invoice" | "email" | "new-card" | "processing" | "success" | "failed";

export default function PaymentModal({
  isOpen,
  onClose,
  invoice,
  onPaymentComplete,
  onDecline,
}: PaymentModalProps) {
  const { processPayment } = usePayment();
  const { markAsPaid, markAsDeclined } = useInvoices();
  const { user, updateProfile } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useToast();

  const [step, setStep] = useState<PaymentStep>("invoice");
  const [isProcessing, setIsProcessing] = useState(false);
  const [failedReason, setFailedReason] = useState<string>("");
  const [billingEmail, setBillingEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idempotencyKeyRef = useRef<string>("");

  useEffect(() => {
    if (isOpen) {
      setStep("invoice");
      setIsProcessing(false);
      setFailedReason("");
      setBillingEmail(isValidEmail(user?.email) ? (user?.email ?? "") : "");
      setEmailError("");
      idempotencyKeyRef.current = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [isOpen, user?.email]);

  const handleProcessPayment = useCallback(
    async (data: CardFormData) => {
      if (!invoice || !user) {
        addToast(t("payment", "paymentFailed"), "error");
        return;
      }
      if (isProcessing) return;

      const invoiceId = invoice.id;
      const invoiceAmount = invoice.amount;

      setStep("processing");
      setIsProcessing(true);
      setFailedReason("");

      const cardDetailsForGateway: CardPaymentDetails = {
        cardNumber: data.cardNumber,
        cardExpMonth: data.expiryMonth,
        cardExpYear: data.expiryYear,
        cardCvv: data.cvv,
        cardholderName: data.cardholderName,
        firstName: data.firstName,
        lastName: data.lastName,
      };

      try {
        const transaction = await processPayment(
          invoiceId,
          `temp-${Date.now()}`,
          invoiceAmount,
          cardDetailsForGateway,
          idempotencyKeyRef.current,
          billingEmail || user.email || ""
        );
        markAsPaid(invoiceId, transaction.id);

        setStep("success");
        addToast(t("payment", "paymentSuccessful"), "success");
        onPaymentComplete?.();

        autoCloseTimerRef.current = setTimeout(() => onClose(), 2200);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Pago rechazado";
        setFailedReason(message);
        setStep("failed");
        setIsProcessing(false);
      }
    },
    [invoice, user, isProcessing, processPayment, markAsPaid, addToast, t, onPaymentComplete, onClose, billingEmail]
  );

  const handleStartCard = useCallback(() => {
    if (!invoice) return;
    // 3D Secure flow: instead of collecting the card in-app (the direct
    // AUTH_CAPTURE charge gets declined when the CCLW enforces 3DS), forward
    // the customer to the /pay landing, which builds a Paguelo Facil hosted
    // checkout URL and redirects there. Paguelo Facil performs the 3DS
    // challenge on their page, then the webhook marks the invoice as paid.
    window.location.href = `/pay?invoice=${encodeURIComponent(invoice.id)}`;
  }, [invoice]);

  const handleEmailContinue = useCallback(() => {
    if (!isValidEmail(billingEmail)) {
      setEmailError(
        language === "es"
          ? "Por favor ingresa un correo válido."
          : "Please enter a valid email."
      );
      return;
    }
    setEmailError("");
    // Persist to the user profile so they don't have to type it again next time.
    updateProfile({ email: billingEmail.trim().toLowerCase() });
    setStep("new-card");
  }, [billingEmail, language, updateProfile]);

  const handleDecline = useCallback(() => {
    if (invoice) markAsDeclined(invoice.id);
    onDecline?.();
    onClose();
  }, [invoice, markAsDeclined, onDecline, onClose]);

  if (!invoice) return null;

  const descriptionText = invoice.description
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
            INVOICE DETAIL
            ═══════════════════════════════════════════ */}
        {step === "invoice" && (
          <motion.div
            key="invoice"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
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
                          {typeof item.name === "object"
                            ? (item.name as Record<string, string>)[language] ||
                              (item.name as Record<string, string>).en
                            : item.name}
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

                  {(invoice.subtotal || invoice.taxAmount) && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border-subtle)" }}>
                      {invoice.subtotal && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Subtotal</span>
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

                  <div style={{ borderTop: "2px dashed var(--color-border-default)", margin: "16px 0" }} />

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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                marginBottom: 16,
                borderRadius: 12,
                background: "var(--color-bg-glass)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <ShieldCheck size={18} style={{ color: "var(--color-accent)" }} />
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {language === "es"
                  ? "Cobro seguro vía Paguelo Fácil. Tus datos se envían encriptados directo al procesador."
                  : "Secure card charge via Paguelo Fácil. Your data is encrypted in transit."}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartCard}
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
                }}
              >
                <CreditCard size={16} />
                {t("payment", "payAmount")} {formatPrice(invoice.amount)}
              </motion.button>

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
            EMAIL CAPTURE (only when account has no real email)
            ═══════════════════════════════════════════ */}
        {step === "email" && (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
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

            <div className="text-center mb-6">
              <div
                className="inline-flex items-center justify-center"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--color-accent-subtle)",
                  marginBottom: 14,
                }}
              >
                <Mail size={22} style={{ color: "var(--color-accent)" }} />
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-accent)",
                  fontSize: "clamp(22px, 5vw, 28px)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "var(--color-text-primary)",
                  lineHeight: 1.2,
                  letterSpacing: "-0.01em",
                  margin: 0,
                }}
              >
                {language === "es" ? "Correo para tu recibo" : "Email for your receipt"}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: "var(--color-text-muted)",
                  marginTop: 10,
                  lineHeight: 1.5,
                  maxWidth: 320,
                  margin: "10px auto 0",
                }}
              >
                {language === "es"
                  ? "Lo necesitamos para enviarte la confirmación del pago y para que el procesador acepte el cargo."
                  : "We need it to email your payment confirmation and so the processor accepts the charge."}
              </p>
            </div>

            <label
              className="block mb-1.5"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {language === "es" ? "Correo electrónico" : "Email"}
            </label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={billingEmail}
              onChange={(e) => {
                setBillingEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleEmailContinue();
                }
              }}
              placeholder="tu@correo.com"
              className="w-full px-4 py-3"
              style={{
                background: "var(--color-bg-input)",
                border: emailError
                  ? "1px solid #9B4D4D"
                  : "1px solid var(--color-border-default)",
                color: "var(--color-text-primary)",
                fontSize: 15,
                outline: "none",
                borderRadius: 12,
                letterSpacing: "0.02em",
              }}
            />
            {emailError && (
              <p style={{ marginTop: 6, fontSize: 12, color: "#9B4D4D" }}>{emailError}</p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep("invoice")}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--color-bg-glass)",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-secondary)",
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  cursor: "pointer",
                }}
              >
                {t("common", "cancel")}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEmailContinue}
                style={{
                  flex: 2,
                  height: 48,
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
                }}
              >
                {language === "es" ? "Continuar al pago" : "Continue to payment"}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════
            CARD ENTRY
            ═══════════════════════════════════════════ */}
        {step === "new-card" && (
          <motion.div
            key="new-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
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
              onSubmit={handleProcessPayment}
              onCancel={() => setStep("invoice")}
              isProcessing={isProcessing}
              showSaveOption={false}
            />
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════
            PROCESSING
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
            SUCCESS
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
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              className="mb-6 flex items-center justify-center"
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.1)",
                border: "2px solid rgba(34, 197, 94, 0.3)",
              }}
            >
              <Check size={32} style={{ color: "#22c55e" }} strokeWidth={3} />
            </motion.div>
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
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════
            FAILED / DECLINED
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

            <div className="text-center space-y-2">
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
                  letterSpacing: "0.04em",
                  maxWidth: 360,
                  margin: "0 auto",
                }}
              >
                {failedReason ||
                  (language === "es"
                    ? "El banco rechazó el cargo. Puedes intentar con otra tarjeta."
                    : "Your bank declined the charge. Please try with another card.")}
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setStep("new-card");
                  setIsProcessing(false);
                  idempotencyKeyRef.current = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
