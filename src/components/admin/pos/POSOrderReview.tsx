"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { formatPrice, calculateTaxBreakdown } from "@/lib/utils";
import {
  Scissors,
  ShoppingBag,
  Receipt,
  User,
  Tag,
} from "lucide-react";
import type { InvoiceItem } from "@/types";
import type { POSClient } from "./POSClientSelector";

interface POSOrderReviewProps {
  client: POSClient;
  items: InvoiceItem[];
  selectedStylistId?: string | null;
  onStylistChange?: (stylistId: string | null) => void;
  discount: number;
  onDiscountChange: (discount: number) => void;
}

export default function POSOrderReview({
  client,
  items,
  selectedStylistId,
  onStylistChange,
  discount,
  onDiscountChange,
}: POSOrderReviewProps) {
  const { t, language } = useLanguage();
  const { allStylists } = useStaff();

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { discountAmount, afterDiscount, taxAmount, total } = calculateTaxBreakdown(subtotal, discount);

  return (
    <div className="space-y-4">
      {/* Client info */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{
          background: "var(--color-bg-glass)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "var(--color-accent-subtle)",
            border: "1px solid var(--color-border-accent)",
          }}
        >
          <span
            className="text-sm font-bold"
            style={{ color: "var(--color-accent)" }}
          >
            {client.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {client.name}
          </p>
          {client.phone && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {client.phone}
            </p>
          )}
        </div>
      </div>

      {/* Stylist selector */}
      {items.some((i) => i.type === "service") && onStylistChange && (
        <div
          className="rounded-xl p-4 space-y-2"
          style={{
            background: "var(--color-bg-glass)",
            border: "1px solid var(--color-border-default)",
          }}
        >
          <div className="flex items-center gap-2">
            <User size={14} style={{ color: "var(--color-accent)" }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-accent)" }}
            >
              {language === "es" ? "Estilista" : "Stylist"}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {allStylists.map((s) => (
              <button
                key={s.id}
                onClick={() => onStylistChange(selectedStylistId === s.id ? null : s.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                style={{
                  background: selectedStylistId === s.id ? "var(--color-accent-subtle)" : "var(--color-bg-glass-hover)",
                  border: selectedStylistId === s.id ? "1px solid var(--color-border-accent)" : "1px solid var(--color-border-default)",
                  color: selectedStylistId === s.id ? "var(--color-accent)" : "var(--color-text-secondary)",
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: "1px solid var(--color-border-default)",
          background: "var(--color-bg-glass)",
        }}
      >
        <div
          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
          style={{
            color: "var(--color-accent)",
            background: "var(--color-accent-subtle)",
            borderBottom: "1px solid var(--color-border-accent)",
          }}
        >
          <Receipt size={12} />
          {t("pos", "orderSummary")} ({items.length} {t("pos", "items")})
        </div>

        {items.map((item, idx) => (
          <div
            key={`${item.type}-${item.id}-${idx}`}
            className="flex items-center gap-3 px-4 py-3"
            style={{
              borderBottom:
                idx < items.length - 1
                  ? "1px solid var(--color-border-default)"
                  : "none",
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--color-accent-subtle)",
              }}
            >
              {item.type === "service" ? (
                <Scissors size={13} style={{ color: "var(--color-accent)" }} />
              ) : (
                <ShoppingBag size={13} style={{ color: "var(--color-accent)" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span
                className="text-sm truncate block"
                style={{ color: "var(--color-text-primary)" }}
              >
                {item.name}
              </span>
              {item.quantity > 1 && (
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {formatPrice(item.price)} x {item.quantity}
                </span>
              )}
            </div>
            <span
              className="text-sm font-medium tabular-nums"
              style={{ color: "var(--color-text-primary)" }}
            >
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* Discount input */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          background: "var(--color-bg-glass)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <Tag size={14} style={{ color: "var(--color-accent)" }} />
        <span className="text-sm flex-1" style={{ color: "var(--color-text-secondary)" }}>
          {language === "es" ? "Descuento" : "Discount"} (%)
        </span>
        <div className="flex items-center gap-1.5">
          {[0, 5, 10, 15, 20].map((pct) => (
            <button
              key={pct}
              onClick={() => onDiscountChange(pct)}
              className="px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer"
              style={{
                background: discount === pct ? "var(--color-accent)" : "var(--color-bg-glass-hover)",
                border: discount === pct ? "none" : "1px solid var(--color-border-default)",
                color: discount === pct ? "white" : "var(--color-text-secondary)",
              }}
            >
              {pct === 0 ? "—" : `${pct}%`}
            </button>
          ))}
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={discount || ""}
            onChange={(e) => {
              const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
              onDiscountChange(val);
            }}
            placeholder="0"
            className="w-12 text-center text-sm rounded-md px-2 py-1"
            style={{
              background: "var(--color-bg-input)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
              outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border-default)"; }}
          />
        </div>
      </div>

      {/* Tax breakdown */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: "1px solid var(--color-border-accent)",
          background: "var(--color-bg-glass)",
        }}
      >
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {t("pos", "subtotal")}
            </span>
            <span className="text-sm font-medium tabular-nums" style={{ color: "var(--color-text-primary)" }}>
              {formatPrice(subtotal)}
            </span>
          </div>

          {discountAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-1.5" style={{ color: "#22c55e" }}>
                <Tag size={12} />
                {language === "es" ? `Descuento ${discount}%` : `Discount ${discount}%`}
              </span>
              <span className="text-sm font-medium tabular-nums" style={{ color: "#22c55e" }}>
                -{formatPrice(discountAmount)}
              </span>
            </div>
          )}

          {discountAmount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {language === "es" ? "Después de descuento" : "After discount"}
              </span>
              <span className="text-sm font-medium tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                {formatPrice(afterDiscount)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {t("pos", "itbms")} (7%)
            </span>
            <span className="text-sm font-medium tabular-nums" style={{ color: "var(--color-text-primary)" }}>
              {formatPrice(taxAmount)}
            </span>
          </div>
        </div>
        <div
          className="flex items-center justify-between px-4 py-3 font-bold"
          style={{
            borderTop: "1px solid var(--color-border-accent)",
            background: "var(--color-accent-subtle)",
          }}
        >
          <span style={{ color: "var(--color-text-primary)" }}>
            {t("pos", "total")}
          </span>
          <span className="text-lg" style={{ color: "var(--color-accent)" }}>
            {formatPrice(total)}
          </span>
        </div>
        <div className="px-4 py-2 text-center" style={{ borderTop: "1px solid var(--color-border-accent)" }}>
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {language === "es" ? "ITBMS incluido en el total" : "ITBMS included in total"}
          </p>
        </div>
      </div>
    </div>
  );
}
