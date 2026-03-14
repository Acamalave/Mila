"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { formatPrice, getStoredData } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { Clock, Send, CheckCircle2, Plus } from "lucide-react";
import type { Invoice } from "@/types";

interface POSPendingViewProps {
  invoiceId: string;
  amount: number;
  clientName: string;
  language: "en" | "es";
  onNewSale: () => void;
  onPaid: () => void;
}

export default function POSPendingView({
  invoiceId,
  amount,
  clientName,
  language,
  onNewSale,
  onPaid,
}: POSPendingViewProps) {
  const [showContent, setShowContent] = useState(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Poll for invoice status changes
  useEffect(() => {
    if (!invoiceId) return;

    const interval = setInterval(() => {
      const invoices = getStoredData<Invoice[]>("mila-invoices", []);
      const invoice = invoices.find((inv) => inv.id === invoiceId);
      if (invoice && invoice.status === "paid") {
        onPaidRef.current();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [invoiceId]);

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      {/* Animated clock icon */}
      <div className="relative">
        {/* Pulse ring */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.4 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{
            duration: 2,
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
            <Clock size={36} color="white" strokeWidth={2.5} />
          </motion.div>
        </motion.div>
      </div>

      {/* Pending text */}
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
            {language === "es" ? "Cobro Enviado" : "Payment Request Sent"}
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
            {formatPrice(amount)}
          </p>

          {/* Invoice ID */}
          <p
            className="text-xs font-mono"
            style={{ color: "var(--color-text-muted)" }}
          >
            {invoiceId}
          </p>

          {/* Status badge */}
          <div className="flex justify-center pt-1">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: "var(--color-bg-glass)",
                border: "1px solid var(--color-border-default)",
                color: "var(--color-text-secondary)",
              }}
            >
              <Send size={12} />
              {language === "es" ? "Pendiente de pago" : "Awaiting payment"}
            </span>
          </div>
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
            {language === "es" ? "Nueva Venta" : "New Sale"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
