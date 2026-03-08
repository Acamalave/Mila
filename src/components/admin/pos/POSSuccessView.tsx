"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { Check, FileText, Plus } from "lucide-react";

interface POSSuccessViewProps {
  total: number;
  clientName: string;
  paymentMethod: "card" | "counter";
  onNewSale: () => void;
  onViewInvoice?: () => void;
}

export default function POSSuccessView({
  total,
  clientName,
  paymentMethod,
  onNewSale,
  onViewInvoice,
}: POSSuccessViewProps) {
  const { language, t } = useLanguage();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 600);
    return () => clearTimeout(timer);
  }, []);

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
            {paymentMethod === "card"
              ? language === "es"
                ? "Pagado con tarjeta"
                : "Paid by card"
              : language === "es"
              ? "Pago en mostrador"
              : "Counter payment"}
          </p>
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
