"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useProducts } from "@/providers/ProductProvider";
import { services } from "@/data/services";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import {
  Plus,
  Minus,
  Trash2,
  Scissors,
  ShoppingBag,
  PackageOpen,
} from "lucide-react";
import type { InvoiceItem } from "@/types";
import { useStaff } from "@/providers/StaffProvider";

interface POSItemSelectorProps {
  items: InvoiceItem[];
  onItemsChange: (items: InvoiceItem[]) => void;
}

export default function POSItemSelector({
  items,
  onItemsChange,
}: POSItemSelectorProps) {
  const { language, t } = useLanguage();
  const { allProducts } = useProducts();
  const { allStylists } = useStaff();
  const [tab, setTab] = useState<"services" | "products">("services");

  const updateItemStylist = (index: number, stylistId: string) => {
    const stylist = allStylists.find((s) => s.id === stylistId);
    onItemsChange(
      items.map((li, i) =>
        i === index
          ? { ...li, stylistId: stylistId || undefined, stylistName: stylist?.name || undefined }
          : li
      )
    );
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addService = (serviceId: string) => {
    if (items.some((li) => li.id === serviceId && li.type === "service")) return;
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    onItemsChange([
      ...items,
      {
        type: "service",
        id: svc.id,
        name: svc.name[language],
        price: svc.price,
        quantity: 1,
      },
    ]);
  };

  const addProduct = (productId: string) => {
    const existing = items.find(
      (li) => li.id === productId && li.type === "product"
    );
    if (existing) {
      onItemsChange(
        items.map((li) =>
          li.id === productId && li.type === "product"
            ? { ...li, quantity: li.quantity + 1 }
            : li
        )
      );
    } else {
      const prod = allProducts.find((p) => p.id === productId);
      if (!prod) return;
      const effectivePrice =
        prod.discount && prod.discount > 0
          ? Math.round(prod.price * (1 - prod.discount / 100) * 100) / 100
          : prod.price;
      onItemsChange([
        ...items,
        {
          type: "product",
          id: prod.id,
          name: prod.name,
          price: effectivePrice,
          quantity: 1,
        },
      ]);
    }
  };

  const updateQty = (index: number, qty: number) => {
    if (qty < 1) return;
    onItemsChange(
      items.map((li, i) => (i === index ? { ...li, quantity: qty } : li))
    );
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const updateItemPrice = (index: number, price: number) => {
    if (price < 0) return;
    onItemsChange(
      items.map((li, i) => (i === index ? { ...li, price: Math.round(price * 100) / 100 } : li))
    );
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("services")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
          style={{
            background:
              tab === "services"
                ? "var(--color-accent-subtle)"
                : "var(--color-bg-glass)",
            color:
              tab === "services"
                ? "var(--color-accent)"
                : "var(--color-text-secondary)",
            border:
              tab === "services"
                ? "1px solid var(--color-border-accent)"
                : "1px solid var(--color-border-default)",
          }}
        >
          <Scissors size={14} />
          {t("pos", "services")}
        </button>
        <button
          onClick={() => setTab("products")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
          style={{
            background:
              tab === "products"
                ? "var(--color-accent-subtle)"
                : "var(--color-bg-glass)",
            color:
              tab === "products"
                ? "var(--color-accent)"
                : "var(--color-text-secondary)",
            border:
              tab === "products"
                ? "1px solid var(--color-border-accent)"
                : "1px solid var(--color-border-default)",
          }}
        >
          <ShoppingBag size={14} />
          {t("pos", "products")}
        </button>
      </div>

      {/* Item picker list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: "1px solid var(--color-border-default)",
          background: "var(--color-bg-glass)",
        }}
      >
        <div className="max-h-48 overflow-y-auto">
          {tab === "services" &&
            services.map((svc) => {
              const alreadyAdded = items.some(
                (li) => li.id === svc.id && li.type === "service"
              );
              return (
                <button
                  key={svc.id}
                  onClick={() => addService(svc.id)}
                  disabled={alreadyAdded}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    color: "var(--color-text-primary)",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--color-border-default)",
                  }}
                  onMouseEnter={(e) => {
                    if (!alreadyAdded)
                      e.currentTarget.style.background =
                        "var(--color-bg-glass-selected)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Scissors
                      size={12}
                      style={{ color: "var(--color-text-muted)" }}
                    />
                    <span>{svc.name[language]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-medium text-xs"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {formatPrice(svc.price)}
                    </span>
                    {!alreadyAdded && (
                      <Plus size={14} style={{ color: "var(--color-accent)" }} />
                    )}
                  </div>
                </button>
              );
            })}

          {tab === "products" &&
            allProducts
              .filter((p) => !p.hidden && p.inStock)
              .map((prod) => {
                const effectivePrice =
                  prod.discount && prod.discount > 0
                    ? prod.price * (1 - prod.discount / 100)
                    : prod.price;
                return (
                  <button
                    key={prod.id}
                    onClick={() => addProduct(prod.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer"
                    style={{
                      color: "var(--color-text-primary)",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--color-border-default)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "var(--color-bg-glass-selected)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag
                        size={12}
                        style={{ color: "var(--color-text-muted)" }}
                      />
                      <span>{prod.name}</span>
                      {prod.discount && prod.discount > 0 && (
                        <span className="text-[10px] font-bold text-red-500">
                          -{prod.discount}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-medium text-xs"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {formatPrice(effectivePrice)}
                      </span>
                      <Plus size={14} style={{ color: "var(--color-accent)" }} />
                    </div>
                  </button>
                );
              })}
        </div>
      </div>

      {/* Current items */}
      {items.length > 0 ? (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: "1px solid var(--color-border-accent)",
            background: "var(--color-bg-glass)",
          }}
        >
          <div
            className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
            style={{
              color: "var(--color-accent)",
              background: "var(--color-accent-subtle)",
              borderBottom: "1px solid var(--color-border-accent)",
            }}
          >
            {t("pos", "orderSummary")} ({items.length} {t("pos", "items")})
          </div>
          {items.map((item, idx) => (
            <div
              key={`${item.type}-${item.id}-${idx}`}
              className="px-4 py-3"
              style={{
                borderBottom:
                  idx < items.length - 1
                    ? "1px solid var(--color-border-default)"
                    : "none",
              }}
            >
              <div className="flex items-center gap-3">
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
                  <ShoppingBag
                    size={13}
                    style={{ color: "var(--color-accent)" }}
                  />
                )}
              </div>
              <span
                className="flex-1 text-sm truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {item.name}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateQty(idx, item.quantity - 1)}
                  className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
                  style={{
                    border: "1px solid var(--color-border-default)",
                    background: "none",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <Minus size={11} />
                </button>
                <span
                  className="w-5 text-center text-sm font-medium tabular-nums"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQty(idx, item.quantity + 1)}
                  className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
                  style={{
                    border: "1px solid var(--color-border-default)",
                    background: "none",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <Plus size={11} />
                </button>
              </div>
              {/* Editable unit price */}
              <div className="flex items-center gap-0.5">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price}
                  onChange={(e) => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                  className="w-16 text-right text-sm tabular-nums rounded px-1 py-0.5"
                  style={{
                    background: "var(--color-bg-input)",
                    border: "1px solid var(--color-border-default)",
                    color: "var(--color-accent)",
                    outline: "none",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border-default)"; }}
                /></div>
              <button
                onClick={() => removeItem(idx)}
                className="p-1.5 rounded transition-colors cursor-pointer"
                style={{
                  color: "var(--color-text-muted)",
                  background: "none",
                  border: "none",
                }}
              >
                <Trash2 size={14} />
              </button>
              </div>
              {/* Stylist selector — services only */}
              {item.type === "service" && allStylists.length > 0 && (
                <div className="mt-1.5 flex items-center gap-2 pl-10">
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {language === "es" ? "Estilista:" : "Stylist:"}
                  </span>
                  <select
                    value={item.stylistId ?? ""}
                    onChange={(e) => updateItemStylist(idx, e.target.value)}
                    className="text-xs rounded-md px-2 py-1 flex-1"
                    style={{
                      background: "var(--color-bg-input)",
                      border: "1px solid var(--color-border-default)",
                      color: item.stylistId ? "var(--color-text-primary)" : "var(--color-text-muted)",
                      outline: "none",
                    }}
                  >
                    <option value="">{language === "es" ? "Sin asignar" : "Unassigned"}</option>
                    {allStylists.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
          {/* Subtotal bar */}
          <div
            className="flex items-center justify-between px-4 py-3 font-semibold"
            style={{
              borderTop: "1px solid var(--color-border-accent)",
              background: "var(--color-accent-subtle)",
            }}
          >
            <span style={{ color: "var(--color-text-primary)" }}>Subtotal</span>
            <span style={{ color: "var(--color-accent)" }}>
              {formatPrice(total)}
            </span>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center py-10 rounded-xl"
          style={{
            border: "1px dashed var(--color-border-default)",
            background: "var(--color-bg-glass)",
          }}
        >
          <PackageOpen
            size={32}
            style={{ color: "var(--color-text-muted)", marginBottom: 8 }}
          />
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("pos", "noItems")}
          </p>
        </div>
      )}
    </div>
  );
}
