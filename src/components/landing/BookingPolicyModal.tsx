"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import Modal from "@/components/ui/Modal";
import { Clock, CreditCard, AlertTriangle, Check } from "lucide-react";

export interface DepositServiceInfo {
  name: string;
  depositAmount: number;
  depositType: "fixed" | "percentage";
  depositPercent: number;
}

interface BookingPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  hasColorService: boolean;
  depositServices?: DepositServiceInfo[];
}

export default function BookingPolicyModal({
  isOpen,
  onClose,
  onAccept,
  hasColorService,
  depositServices = [],
}: BookingPolicyModalProps) {
  const { language, t } = useLanguage();
  const [accepted, setAccepted] = useState(true);

  const handleAccept = () => {
    onAccept();
    setAccepted(true);
  };

  const handleClose = () => {
    setAccepted(true);
    onClose();
  };

  // Build dynamic deposit text from actual services
  const buildDepositText = (): string | null => {
    if (depositServices.length === 0) {
      // Fallback to old behavior for color services without deposit config
      if (hasColorService) return t("bookingPolicy", "colorDeposit");
      return null;
    }

    if (depositServices.length === 1) {
      const svc = depositServices[0];
      const amountStr = svc.depositType === "percentage"
        ? `${svc.depositPercent}% ($${svc.depositAmount.toFixed(2)})`
        : `$${svc.depositAmount.toFixed(2)}`;

      return language === "es"
        ? `El servicio "${svc.name}" requiere un anticipo de ${amountStr} al momento de reservar para confirmar tu cita.`
        : `The service "${svc.name}" requires a deposit of ${amountStr} at the time of booking to confirm your appointment.`;
    }

    // Multiple services
    const totalDeposit = depositServices.reduce((sum, s) => sum + s.depositAmount, 0);
    const serviceList = depositServices.map((s) => {
      const amt = s.depositType === "percentage"
        ? `${s.depositPercent}% ($${s.depositAmount.toFixed(2)})`
        : `$${s.depositAmount.toFixed(2)}`;
      return `${s.name}: ${amt}`;
    }).join(" + ");

    return language === "es"
      ? `Los servicios seleccionados requieren un anticipo total de $${totalDeposit.toFixed(2)} al momento de reservar (${serviceList}).`
      : `The selected services require a total deposit of $${totalDeposit.toFixed(2)} at the time of booking (${serviceList}).`;
  };

  const depositText = buildDepositText();

  const policies = [
    {
      icon: Clock,
      text: t("bookingPolicy", "cancellation"),
      color: "var(--color-accent)",
    },
    ...(depositText
      ? [
          {
            icon: CreditCard,
            text: depositText,
            color: "#D4A853",
          },
        ]
      : []),
    {
      icon: AlertTriangle,
      text: depositText
        ? (language === "es"
          ? "En caso de no asistir y no notificar con al menos 24 horas de anticipación, el anticipo no será reembolsable."
          : "In case of no-show without at least 24 hours notice, the deposit is non-refundable.")
        : t("bookingPolicy", "noShow"),
      color: "#9B4D4D",
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("bookingPolicy", "title")} size="md">
      <div className="space-y-6">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {t("bookingPolicy", "subtitle")}
        </p>

        {/* Policies */}
        <div className="space-y-4">
          {policies.map((policy, i) => {
            const Icon = policy.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{
                  background: "var(--color-bg-glass)",
                  border: "1px solid var(--color-border-default)",
                }}
              >
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
                  style={{
                    background: "var(--color-accent-subtle)",
                    border: "1px solid var(--color-border-accent)",
                  }}
                >
                  <Icon size={14} style={{ color: policy.color }} />
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {policy.text}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Accept Checkbox */}
        <label
          className="flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-colors"
          style={{
            background: accepted ? "var(--color-accent-subtle)" : "transparent",
            border: `1px solid ${accepted ? "var(--color-border-accent)" : "var(--color-border-default)"}`,
          }}
        >
          <div
            className="flex items-center justify-center w-5 h-5 rounded flex-shrink-0"
            style={{
              background: accepted ? "var(--gradient-accent)" : "transparent",
              border: accepted ? "none" : "2px solid var(--color-border-default)",
              transition: "all 0.2s ease",
            }}
          >
            {accepted && <Check size={12} style={{ color: "var(--color-text-inverse)" }} />}
          </div>
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="sr-only"
          />
          <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {t("bookingPolicy", "accept")}
          </span>
        </label>

        {/* Confirm Button */}
        <motion.button
          whileHover={accepted ? { scale: 1.02 } : {}}
          whileTap={accepted ? { scale: 0.98 } : {}}
          onClick={handleAccept}
          disabled={!accepted}
          className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity"
          style={{
            background: accepted ? "var(--gradient-accent)" : "var(--color-bg-glass)",
            color: accepted ? "var(--color-text-inverse)" : "var(--color-text-muted)",
            boxShadow: accepted ? "var(--shadow-glow)" : "none",
            border: accepted ? "none" : "1px solid var(--color-border-default)",
            cursor: accepted ? "pointer" : "not-allowed",
            opacity: accepted ? 1 : 0.5,
          }}
        >
          {t("bookingPolicy", "confirm")}
        </motion.button>
      </div>
    </Modal>
  );
}
