"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, X, ExternalLink, ShieldCheck } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useInvoices } from "@/providers/InvoiceProvider";
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

type PaymentStep = "invoice" | "redirecting";

export default function PaymentModal({
  isOpen,
  onClose,
  invoice,
  onPaymentComplete: _onPaymentComplete,
  onDecline,
}: PaymentModalProps) {
  const { markAsDeclined } = useInvoices();
  const { language, t } = useLanguage();
  const { addToast } = useToast();

  const [step, setStep] = useState<PaymentStep>("invoice");
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("invoice");
      setIsCreatingLink(false);
    }
  }, [isOpen]);

  const handlePay = useCallback(async () => {
    if (!invoice || isCreatingLink) return;

    setIsCreatingLink(true);
    setStep("redirecting");

    try {
      const res = await fetch("/api/payments/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const json = (await res.json()) as { success: boolean; linkUrl?: string; error?: string };

      if (!res.ok || !json.success || !json.linkUrl) {
        throw new Error(json.error || "No se pudo iniciar el pago");
      }

      window.location.href = json.linkUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al iniciar el pago";
      addToast(msg, "error");
      setStep("invoice");
      setIsCreatingLink(false);
    }
  }, [invoice, isCreatingLink, addToast]);

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
      onClose={step === "redirecting" ? () => {} : onClose}
      size="md"
    >
      <AnimatePresence mode="wait">
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

                  <div
                    style={{
                      borderTop: "2px dashed var(--color-border-default)",
                      margin: "16px 0",
                    }}
                  />

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

            {/* Secure-checkout note */}
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
                  ? "Pago seguro con Paguelo Fácil. Serás redirigido a la página oficial para completar la transacción con 3D Secure."
                  : "Secure checkout via Paguelo Fácil. You'll be redirected to their official page to complete the transaction with 3D Secure."}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePay}
                disabled={isCreatingLink}
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
                  cursor: isCreatingLink ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.3s ease",
                  opacity: isCreatingLink ? 0.7 : 1,
                }}
              >
                <CreditCard size={16} />
                {t("payment", "payAmount")} {formatPrice(invoice.amount)}
                <ExternalLink size={14} style={{ opacity: 0.7 }} />
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

        {step === "redirecting" && (
          <motion.div
            key="redirecting"
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
                <ExternalLink size={20} style={{ color: "var(--color-accent)" }} />
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
              {language === "es" ? "Redirigiendo a Paguelo Fácil" : "Redirecting to Paguelo Fácil"}
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
      </AnimatePresence>
    </Modal>
  );
}
