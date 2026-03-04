"use client";

import { motion } from "motion/react";
import { Check, FileText, Calendar, Clock } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";
import { formatPrice } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types";

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onPay: () => void;
}

const STATUS_BADGE_VARIANT: Record<InvoiceStatus, "gold" | "success" | "default" | "warning"> = {
  sent: "gold",
  paid: "success",
  draft: "default",
  overdue: "warning",
};

const STATUS_LABELS: Record<InvoiceStatus, Record<"en" | "es", string>> = {
  draft: { en: "Draft", es: "Borrador" },
  sent: { en: "Sent", es: "Enviada" },
  paid: { en: "Paid", es: "Pagada" },
  overdue: { en: "Overdue", es: "Vencida" },
};

export default function InvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
  onPay,
}: InvoiceDetailModalProps) {
  const { language, t } = useLanguage();

  if (!invoice) return null;

  const descriptionText =
    invoice.description
      ? typeof invoice.description === "string"
        ? invoice.description
        : invoice.description[language] || invoice.description.en
      : "";

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(
      language === "es" ? "es-ES" : "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="space-y-5">
        {/* Invoice header */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div
            className="mx-auto mb-3 flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--color-accent-subtle)",
            }}
          >
            <FileText size={22} style={{ color: "var(--color-accent)" }} />
          </div>
          <h3
            className="text-lg font-semibold"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
            }}
          >
            {t("payment", "invoiceFrom")}
          </h3>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            {invoice.id}
          </p>
        </motion.div>

        {/* Receipt card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--color-bg-glass)",
            border: "1px solid var(--color-border-default)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Status bar at top */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{
              borderBottom: "1px solid var(--color-border-subtle)",
            }}
          >
            <span
              className="text-xs uppercase tracking-wider font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              Status
            </span>
            <Badge variant={STATUS_BADGE_VARIANT[invoice.status]}>
              {STATUS_LABELS[invoice.status][language]}
            </Badge>
          </div>

          {/* Invoice details */}
          <div className="p-5 space-y-4">
            {/* Client */}
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                {language === "es" ? "Cliente" : "Client"}
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--color-text-primary)" }}
              >
                {invoice.clientName}
              </span>
            </div>

            {/* Description */}
            {descriptionText && (
              <div>
                <span
                  className="text-xs font-medium uppercase tracking-wider block mb-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {language === "es" ? "Descripcion" : "Description"}
                </span>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
                >
                  {descriptionText}
                </p>
              </div>
            )}

            {/* Dates */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar size={12} style={{ color: "var(--color-text-muted)" }} />
                  <span
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {language === "es" ? "Fecha" : "Date"}
                  </span>
                </div>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {formatDate(invoice.date)}
                </p>
              </div>
              {invoice.dueDate && (
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock size={12} style={{ color: "var(--color-text-muted)" }} />
                    <span
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {language === "es" ? "Vence" : "Due"}
                    </span>
                  </div>
                  <p
                    className="text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
              )}
            </div>

            {/* Paid date */}
            {invoice.paidAt && (
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {language === "es" ? "Pagada el" : "Paid on"}
                </span>
                <span
                  className="text-sm"
                  style={{ color: "#22c55e" }}
                >
                  {formatDate(invoice.paidAt)}
                </span>
              </div>
            )}
          </div>

          {/* Divider - dashed receipt style */}
          <div
            className="mx-5"
            style={{
              borderTop: "2px dashed var(--color-border-default)",
            }}
          />

          {/* Amount */}
          <div className="p-5 text-center">
            <p
              className="text-xs uppercase tracking-wider mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              {language === "es" ? "Total" : "Total Amount"}
            </p>
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
              className="text-3xl font-bold"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-text-primary)",
              }}
            >
              {formatPrice(invoice.amount)}
            </motion.p>
          </div>
        </motion.div>

        {/* Action area */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {invoice.status === "sent" || invoice.status === "overdue" ? (
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={onPay}
            >
              {t("payment", "payNow")} - {formatPrice(invoice.amount)}
            </Button>
          ) : invoice.status === "paid" ? (
            <div
              className="flex items-center justify-center gap-2 py-3 rounded-xl"
              style={{
                background: "rgba(34, 197, 94, 0.08)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Check size={20} style={{ color: "#22c55e" }} strokeWidth={3} />
              </motion.div>
              <span
                className="text-sm font-semibold"
                style={{ color: "#22c55e" }}
              >
                {STATUS_LABELS.paid[language]}
              </span>
            </div>
          ) : null}
        </motion.div>
      </div>
    </Modal>
  );
}
