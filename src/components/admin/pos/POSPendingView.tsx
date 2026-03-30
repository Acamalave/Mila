"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { formatPrice } from "@/lib/utils";
import { useInvoices } from "@/providers/InvoiceProvider";
import Button from "@/components/ui/Button";
import { Clock, Send, Plus, XCircle } from "lucide-react";

interface POSPendingViewProps {
  invoiceId: string;
  amount: number;
  clientName: string;
  language: "en" | "es";
  onNewSale: () => void;
  onPaid: () => void;
  onDeclined?: () => void;
}

export default function POSPendingView({
  invoiceId,
  amount,
  clientName,
  language,
  onNewSale,
  onPaid,
  onDeclined,
}: POSPendingViewProps) {
  const [showContent, setShowContent] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  const { invoices } = useInvoices();

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // React to invoice status changes from InvoiceProvider
  // (covers localStorage, Firestore real-time sync, and event bus updates)
  useEffect(() => {
    if (!invoiceId) return;
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (invoice && invoice.status === "paid") {
      onPaidRef.current();
    }
    if (invoice && invoice.status === "declined") {
      setIsDeclined(true);
      onDeclined?.();
    }
  }, [invoiceId, invoices, onDeclined]);

  if (isDeclined) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-6">
        {/* Declined icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          className="flex items-center justify-center"
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.1)",
            border: "2px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          <XCircle size={36} style={{ color: "#ef4444" }} strokeWidth={2} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h3 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {language === "es" ? "Cobro Rechazado" : "Payment Declined"}
          </h3>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {clientName}
          </p>
          <p className="text-2xl font-bold" style={{ color: "#ef4444" }}>
            {formatPrice(amount)}
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {language === "es"
              ? "El cliente rechazó la solicitud de pago."
              : "The client declined the payment request."}
          </p>
        </motion.div>

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
      </div>
    );
  }

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
