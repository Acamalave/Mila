"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { CreditCard, Lock, CheckCircle, AlertCircle, X } from "lucide-react";
import type { ServiceDepositConfig } from "@/types/service";

interface DepositService {
  id: string;
  name: string;
  price: number;
  deposit: ServiceDepositConfig;
  depositAmount: number;
}

interface DepositPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (transactionId: string) => void;
  depositServices: DepositService[];
  totalDeposit: number;
}

export default function DepositPaymentModal({
  isOpen,
  onClose,
  onPaymentComplete,
  depositServices,
  totalDeposit,
}: DepositPaymentModalProps) {
  const { language } = useLanguage();
  const [step, setStep] = useState<"form" | "processing" | "success" | "error">("form");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 16);
    return cleaned.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length >= 3) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return cleaned;
  };

  const isFormValid = cardNumber.replace(/\s/g, "").length >= 15 && cardName.length >= 2 && expiry.length >= 4 && cvv.length >= 3;

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setStep("processing");
    setErrorMsg("");

    try {
      const cleanCard = cardNumber.replace(/\s/g, "");
      const [expMonth, expYear] = expiry.split("/");

      const res = await fetch("/api/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalDeposit,
          description: `Mila Concept - Booking Deposit`,
          clientName: cardName,
          cardNumber: cleanCard,
          cardExpMonth: expMonth,
          cardExpYear: `20${expYear}`,
          cardCvv: cvv,
          invoiceId: `deposit-${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStep("success");
        setTimeout(() => {
          onPaymentComplete(data.transactionId || `dep-${Date.now()}`);
        }, 1500);
      } else {
        setErrorMsg(data.message || (language === "es" ? "Pago rechazado" : "Payment declined"));
        setStep("error");
      }
    } catch {
      setErrorMsg(language === "es" ? "Error de conexión. Intenta de nuevo." : "Connection error. Please try again.");
      setStep("error");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border-default)" }}
        >
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(196,169,106,0.15)" }}>
                <CreditCard size={20} style={{ color: "var(--color-accent)" }} />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary text-sm">
                  {language === "es" ? "Anticipo Requerido" : "Deposit Required"}
                </h3>
                <p className="text-xs text-text-muted">
                  {language === "es" ? "Para confirmar tu reserva" : "To confirm your booking"}
                </p>
              </div>
            </div>
            {step === "form" && (
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-text-muted">
                <X size={18} />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {step === "form" && (
              <div className="space-y-5">
                {/* Deposit breakdown */}
                <div className="space-y-2 p-4 rounded-xl" style={{ background: "var(--color-bg-glass)" }}>
                  {depositServices.map((svc) => (
                    <div key={svc.id} className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">{svc.name}</span>
                      <div className="text-right">
                        <span className="text-text-primary font-medium">${svc.depositAmount.toFixed(2)}</span>
                        <span className="text-text-muted text-xs ml-1">
                          ({svc.deposit.depositType === "percentage" ? `${svc.deposit.depositAmount}%` : language === "es" ? "fijo" : "fixed"})
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 flex justify-between items-center font-semibold" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                    <span className="text-text-primary">{language === "es" ? "Total anticipo" : "Total deposit"}</span>
                    <span style={{ color: "var(--color-accent)" }}>${totalDeposit.toFixed(2)}</span>
                  </div>
                </div>

                {/* Card form */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">{language === "es" ? "Nombre en la tarjeta" : "Name on card"}</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none"
                      style={{ background: "var(--color-bg-glass)", border: "1px solid var(--color-border-default)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">{language === "es" ? "Número de tarjeta" : "Card number"}</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4111 1111 1111 1111"
                      maxLength={19}
                      className="w-full px-4 py-3 rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none"
                      style={{ background: "var(--color-bg-glass)", border: "1px solid var(--color-border-default)" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">{language === "es" ? "Vencimiento" : "Expiry"}</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-4 py-3 rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none"
                        style={{ background: "var(--color-bg-glass)", border: "1px solid var(--color-border-default)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">CVV</label>
                      <input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-3 rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none"
                        style={{ background: "var(--color-bg-glass)", border: "1px solid var(--color-border-default)" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Security note */}
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Lock size={12} />
                  <span>{language === "es" ? "Pago seguro procesado por Paguelo Fácil" : "Secure payment processed by Paguelo Fácil"}</span>
                </div>

                {/* Pay button */}
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all"
                  style={{
                    background: isFormValid ? "var(--color-accent)" : "var(--color-bg-glass)",
                    color: isFormValid ? "#0a0a0a" : "var(--color-text-muted)",
                    cursor: isFormValid ? "pointer" : "not-allowed",
                  }}
                >
                  {language === "es" ? `Pagar anticipo $${totalDeposit.toFixed(2)}` : `Pay deposit $${totalDeposit.toFixed(2)}`}
                </button>
              </div>
            )}

            {step === "processing" && (
              <div className="flex flex-col items-center py-8 gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
                <p className="text-text-secondary text-sm">{language === "es" ? "Procesando pago..." : "Processing payment..."}</p>
              </div>
            )}

            {step === "success" && (
              <div className="flex flex-col items-center py-8 gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                  <CheckCircle size={32} className="text-green-500" />
                </div>
                <div className="text-center">
                  <p className="text-text-primary font-semibold">{language === "es" ? "¡Pago exitoso!" : "Payment successful!"}</p>
                  <p className="text-text-muted text-sm mt-1">{language === "es" ? "Confirmando tu reserva..." : "Confirming your booking..."}</p>
                </div>
              </div>
            )}

            {step === "error" && (
              <div className="flex flex-col items-center py-8 gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                  <AlertCircle size={32} className="text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-text-primary font-semibold">{language === "es" ? "Pago rechazado" : "Payment declined"}</p>
                  <p className="text-text-muted text-sm mt-1">{errorMsg}</p>
                </div>
                <button
                  onClick={() => setStep("form")}
                  className="px-6 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "var(--color-bg-glass)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-default)" }}
                >
                  {language === "es" ? "Intentar de nuevo" : "Try again"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
