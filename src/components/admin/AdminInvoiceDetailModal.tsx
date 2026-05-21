"use client";

import { motion } from "motion/react";
import { Calendar, Clock, FileText, User as UserIcon } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { formatPrice } from "@/lib/utils";
import { services } from "@/data/services";
import type { Invoice, InvoiceStatus } from "@/types";

interface AdminInvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

const STATUS_BADGE_VARIANT: Record<InvoiceStatus, "gold" | "success" | "default" | "warning" | "error"> = {
  sent: "gold",
  paid: "success",
  draft: "default",
  overdue: "warning",
  declined: "error",
};

const STATUS_LABELS: Record<InvoiceStatus, Record<"en" | "es", string>> = {
  draft: { en: "Draft", es: "Borrador" },
  sent: { en: "Sent", es: "Enviada" },
  paid: { en: "Paid", es: "Pagada" },
  overdue: { en: "Overdue", es: "Vencida" },
  declined: { en: "Declined", es: "Rechazada" },
};

export default function AdminInvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
}: AdminInvoiceDetailModalProps) {
  const { language } = useLanguage();
  const { allStylists } = useStaff();

  if (!invoice) return null;

  const descriptionText = invoice.description
    ? typeof invoice.description === "string"
      ? invoice.description
      : invoice.description[language] || invoice.description.en
    : "";

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(
      language === "es" ? "es-ES" : "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );

  const stylistName = (id?: string) =>
    id ? allStylists.find((s) => s.id === id)?.name ?? id : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Header */}
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
            {language === "es" ? "Detalle de Factura" : "Invoice Detail"}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            {invoice.id}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--color-bg-glass)",
            border: "1px solid var(--color-border-default)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Status bar */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <span
              className="text-xs uppercase tracking-wider font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              {language === "es" ? "Estado" : "Status"}
            </span>
            <Badge variant={STATUS_BADGE_VARIANT[invoice.status]}>
              {STATUS_LABELS[invoice.status][language]}
            </Badge>
          </div>

          {/* Body */}
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

            {/* Stylist (invoice-level) — optional */}
            {invoice.stylistId && (
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {language === "es" ? "Estilista" : "Stylist"}
                </span>
                <span
                  className="text-sm flex items-center gap-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <UserIcon size={12} />
                  {stylistName(invoice.stylistId)}
                </span>
              </div>
            )}

            {/* Description */}
            {descriptionText && (
              <div>
                <span
                  className="text-xs font-medium uppercase tracking-wider block mb-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {language === "es" ? "Descripción" : "Description"}
                </span>
                <p
                  className="text-sm"
                  style={{
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.5,
                  }}
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
              {invoice.paidAt && (
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock size={12} style={{ color: "#22c55e" }} />
                    <span
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {language === "es" ? "Pagada el" : "Paid on"}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "#22c55e" }}>
                    {formatDate(invoice.paidAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          {invoice.items && invoice.items.length > 0 && (
            <div
              className="px-5 pb-5"
              style={{ borderTop: "1px solid var(--color-border-subtle)" }}
            >
              <p
                className="text-xs font-medium uppercase tracking-wider mt-4 mb-3"
                style={{ color: "var(--color-text-muted)" }}
              >
                {language === "es" ? "Items" : "Items"}
              </p>
              <div className="space-y-2">
                {invoice.items.map((item, idx) => {
                  const matchedService =
                    item.type === "service"
                      ? services.find((s) => s.id === item.id)
                      : null;
                  const itemName =
                    matchedService?.name[language] ??
                    (typeof item.name === "object"
                      ? (item.name as Record<string, string>)[language] ??
                        (item.name as Record<string, string>).en
                      : item.name);
                  const itemStylist = stylistName(item.stylistId);
                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg"
                      style={{
                        background: "var(--color-bg-input)",
                        border: "1px solid var(--color-border-subtle)",
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {itemName}
                          {item.quantity > 1 && (
                            <span
                              className="ml-2 text-xs"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              × {item.quantity}
                            </span>
                          )}
                        </p>
                        <div
                          className="text-[11px] flex items-center gap-2 mt-0.5"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          <span className="capitalize">{item.type}</span>
                          {itemStylist && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <UserIcon size={10} />
                                {itemStylist}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className="text-sm font-medium ml-3"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Totals */}
          <div
            className="px-5 py-4 space-y-1.5"
            style={{ borderTop: "2px dashed var(--color-border-default)" }}
          >
            {typeof invoice.subtotal === "number" && (
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--color-text-muted)" }}>
                  Subtotal
                </span>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {formatPrice(invoice.subtotal)}
                </span>
              </div>
            )}
            {typeof invoice.discount === "number" && invoice.discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--color-text-muted)" }}>
                  {language === "es" ? "Descuento" : "Discount"} ({invoice.discount}%)
                </span>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  -{formatPrice(invoice.discountAmount ?? 0)}
                </span>
              </div>
            )}
            {typeof invoice.taxAmount === "number" && invoice.taxAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--color-text-muted)" }}>
                  {language === "es" ? "Impuesto" : "Tax"}
                  {invoice.taxRate ? ` (${invoice.taxRate}%)` : ""}
                </span>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {formatPrice(invoice.taxAmount)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border-subtle">
              <span
                className="text-xs uppercase tracking-wider font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                Total
              </span>
              <motion.span
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
                className="text-2xl font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-text-primary)",
                }}
              >
                {formatPrice(invoice.amount)}
              </motion.span>
            </div>
          </div>

          {/* Footer: payment / transaction info */}
          {(invoice.paymentMethod || invoice.paymentTransactionId) && (
            <div
              className="px-5 py-3 text-xs flex flex-wrap gap-x-4 gap-y-1"
              style={{
                background: "var(--color-bg-input)",
                color: "var(--color-text-muted)",
                borderTop: "1px solid var(--color-border-subtle)",
              }}
            >
              {invoice.paymentMethod && (
                <span>
                  {language === "es" ? "Método" : "Method"}:{" "}
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    {invoice.paymentMethod}
                  </span>
                </span>
              )}
              {invoice.paymentTransactionId && (
                <span>
                  Tx:{" "}
                  <span
                    className="font-mono"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {invoice.paymentTransactionId}
                  </span>
                </span>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </Modal>
  );
}
