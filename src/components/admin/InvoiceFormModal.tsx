"use client";

import { useState, useEffect, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useLanguage } from "@/providers/LanguageProvider";
import { useProducts } from "@/providers/ProductProvider";
import { useStaff } from "@/providers/StaffProvider";
import { services } from "@/data/services";
import { formatPrice, calculateTaxBreakdown } from "@/lib/utils";
import { Plus, Trash2, ShoppingBag, Scissors, Tag } from "lucide-react";
import type { Invoice, InvoiceStatus, InvoiceItem } from "@/types";

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice;
  onSave: (data: Omit<Invoice, "id" | "createdAt">) => void;
}

function generateClientId(name: string): string {
  return `client-${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export default function InvoiceFormModal({
  isOpen,
  onClose,
  invoice,
  onSave,
}: InvoiceFormModalProps) {
  const { language, t } = useLanguage();
  const { allProducts } = useProducts();
  const { allStylists } = useStaff();
  const isEditing = !!invoice;

  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(todayStr());
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);
  const [manualAmount, setManualAmount] = useState("");
  const [discount, setDiscount] = useState(0);
  const [errors, setErrors] = useState<{ clientName?: string; amount?: string }>({});

  // Item picker state
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [itemPickerTab, setItemPickerTab] = useState<"services" | "products">("services");

  // Reset form when modal opens or invoice changes
  useEffect(() => {
    if (isOpen) {
      if (invoice) {
        setClientName(invoice.clientName);
        setClientId(invoice.clientId);
        // Handle both old { en, es } format and new string format
        const desc = invoice.description;
        if (typeof desc === "string") {
          setDescription(desc);
        } else if (desc && typeof desc === "object") {
          setDescription(desc.en || desc.es || "");
        } else {
          setDescription("");
        }
        setDueDate(invoice.dueDate || todayStr());
        setStatus(invoice.status);
        setLineItems(invoice.items ?? []);
        setManualAmount(String(invoice.subtotal ?? invoice.amount));
        setDiscount(invoice.discount ?? 0);
      } else {
        setClientName("");
        setClientId("");
        setDescription("");
        setDueDate(todayStr());
        setStatus("draft");
        setLineItems([]);
        setManualAmount("");
        setDiscount(0);
      }
      setErrors({});
      setShowItemPicker(false);
    }
  }, [isOpen, invoice]);

  // Auto-generate client ID from name (only when not editing)
  useEffect(() => {
    if (!isEditing && clientName.trim()) {
      setClientId(generateClientId(clientName));
    }
  }, [clientName, isEditing]);

  // Computed subtotal from line items or manual entry
  const itemsTotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [lineItems]
  );

  const baseSubtotal = lineItems.length > 0 ? itemsTotal : Number(manualAmount) || 0;
  const { discountAmount, afterDiscount, taxAmount, taxRate, total: finalAmount } = useMemo(
    () => calculateTaxBreakdown(baseSubtotal, discount),
    [baseSubtotal, discount]
  );

  /* ── Add item helpers ────────────────────────────────────────── */
  const addService = (serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    // Check if already added
    if (lineItems.some((li) => li.id === serviceId && li.type === "service")) return;
    setLineItems((prev) => [
      ...prev,
      {
        type: "service",
        id: svc.id,
        name: svc.name[language],
        price: svc.price,
        quantity: 1,
      },
    ]);
    setShowItemPicker(false);
  };

  const addProduct = (productId: string) => {
    const prod = allProducts.find((p) => p.id === productId);
    if (!prod) return;
    const existing = lineItems.find((li) => li.id === productId && li.type === "product");
    if (existing) {
      setLineItems((prev) =>
        prev.map((li) =>
          li.id === productId && li.type === "product"
            ? { ...li, quantity: li.quantity + 1 }
            : li
        )
      );
    } else {
      const effectivePrice =
        prod.discount && prod.discount > 0
          ? prod.price * (1 - prod.discount / 100)
          : prod.price;
      setLineItems((prev) => [
        ...prev,
        {
          type: "product",
          id: prod.id,
          name: prod.name,
          price: Math.round(effectivePrice * 100) / 100,
          quantity: 1,
        },
      ]);
    }
    setShowItemPicker(false);
  };

  const removeItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemQty = (index: number, qty: number) => {
    if (qty < 1) return;
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, quantity: qty } : li))
    );
  };

  const updateItemPrice = (index: number, price: number) => {
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, price: Math.max(0, Math.round(price * 100) / 100) } : li))
    );
  };

  const updateItemStylist = (index: number, stylistId: string) => {
    const stylist = allStylists.find((s) => s.id === stylistId);
    setLineItems((prev) =>
      prev.map((li, i) =>
        i === index
          ? { ...li, stylistId: stylistId || undefined, stylistName: stylist?.name || undefined }
          : li
      )
    );
  };

  /* ── Submit ──────────────────────────────────────────────────── */
  const handleSubmit = () => {
    const newErrors: { clientName?: string; amount?: string } = {};

    if (!clientName.trim()) {
      newErrors.clientName =
        language === "en" ? "Client name is required" : "El nombre del cliente es requerido";
    }
    if (finalAmount <= 0) {
      newErrors.amount =
        language === "en"
          ? "Add items or enter an amount"
          : "Agrega items o ingresa un monto";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const data: Omit<Invoice, "id" | "createdAt"> = {
      clientName: clientName.trim(),
      clientId: clientId.trim() || generateClientId(clientName),
      amount: finalAmount,
      subtotal: baseSubtotal,
      discount,
      discountAmount,
      afterDiscount,
      taxAmount,
      taxRate,
      status,
      date: new Date().toISOString().split("T")[0],
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(lineItems.length > 0 ? { items: lineItems } : {}),
      ...(dueDate ? { dueDate } : {}),
      // Preserve existing fields if editing
      ...(invoice?.bookingId ? { bookingId: invoice.bookingId } : {}),
      ...(invoice?.sentAt ? { sentAt: invoice.sentAt } : {}),
      ...(invoice?.paidAt ? { paidAt: invoice.paidAt } : {}),
      ...(invoice?.paymentTransactionId
        ? { paymentTransactionId: invoice.paymentTransactionId }
        : {}),
    };

    onSave(data);
    onClose();
  };

  const statusOptions = [
    { value: "draft", label: language === "es" ? "Borrador" : "Draft" },
    { value: "sent", label: language === "es" ? "Enviada" : "Sent" },
    { value: "paid", label: language === "es" ? "Pagada" : "Paid" },
    { value: "overdue", label: language === "es" ? "Vencida" : "Overdue" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t("admin", "editInvoice") : t("admin", "createInvoice")}
      size="lg"
    >
      <div className="space-y-5">
        {/* Client Name + Client ID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`${t("admin", "client")} *`}
            value={clientName}
            onChange={(e) => {
              setClientName(e.target.value);
              if (errors.clientName)
                setErrors((prev) => ({ ...prev, clientName: undefined }));
            }}
            placeholder={language === "en" ? "Client name" : "Nombre del cliente"}
            error={errors.clientName}
          />
          <Input
            label="Client ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="client-id"
          />
        </div>

        {/* Description (single field) */}
        <div className="w-full">
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t("admin", "description")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              language === "es" ? "Descripcion de la factura" : "Invoice description"
            }
            rows={2}
            className="w-full px-4 py-3 rounded-lg transition-all duration-200 resize-none"
            style={{
              background: "var(--color-bg-input)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border-default)",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
              e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border-default)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        {/* ── Line Items ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {language === "es" ? "Items a cobrar" : "Chargeable Items"}
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowItemPicker(!showItemPicker)}
            >
              <Plus size={14} />
              {language === "es" ? "Agregar item" : "Add item"}
            </Button>
          </div>

          {/* Item picker dropdown */}
          {showItemPicker && (
            <div
              className="rounded-lg mb-3 overflow-hidden"
              style={{
                border: "1px solid var(--color-border-default)",
                background: "var(--color-bg-glass)",
              }}
            >
              {/* Tabs */}
              <div
                className="flex gap-1 p-2"
                style={{ borderBottom: "1px solid var(--color-border-default)" }}
              >
                <button
                  onClick={() => setItemPickerTab("services")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer"
                  style={{
                    background:
                      itemPickerTab === "services"
                        ? "var(--color-accent-subtle)"
                        : "transparent",
                    color:
                      itemPickerTab === "services"
                        ? "var(--color-accent)"
                        : "var(--color-text-secondary)",
                  }}
                >
                  <Scissors size={12} />
                  {language === "es" ? "Servicios" : "Services"}
                </button>
                <button
                  onClick={() => setItemPickerTab("products")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer"
                  style={{
                    background:
                      itemPickerTab === "products"
                        ? "var(--color-accent-subtle)"
                        : "transparent",
                    color:
                      itemPickerTab === "products"
                        ? "var(--color-accent)"
                        : "var(--color-text-secondary)",
                  }}
                >
                  <ShoppingBag size={12} />
                  {language === "es" ? "Productos" : "Products"}
                </button>
              </div>

              {/* Items list */}
              <div className="max-h-40 overflow-y-auto p-2 space-y-1">
                {itemPickerTab === "services" &&
                  services.map((svc) => (
                    <button
                      key={svc.id}
                      onClick={() => addService(svc.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors cursor-pointer"
                      style={{
                        color: "var(--color-text-primary)",
                        background: "transparent",
                        border: "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--color-bg-glass-selected)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span>{svc.name[language]}</span>
                      <span
                        className="font-medium text-xs"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {formatPrice(svc.price)}
                      </span>
                    </button>
                  ))}

                {itemPickerTab === "products" &&
                  allProducts.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => addProduct(prod.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors cursor-pointer"
                      style={{
                        color: "var(--color-text-primary)",
                        background: "transparent",
                        border: "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--color-bg-glass-selected)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span>{prod.name}</span>
                      <span
                        className="font-medium text-xs"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {prod.discount && prod.discount > 0
                          ? formatPrice(prod.price * (1 - prod.discount / 100))
                          : formatPrice(prod.price)}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Added items list */}
          {lineItems.length > 0 && (
            <div
              className="rounded-lg overflow-hidden"
              style={{
                border: "1px solid var(--color-border-default)",
                background: "var(--color-bg-glass)",
              }}
            >
              {lineItems.map((item, idx) => (
                <div
                  key={`${item.type}-${item.id}-${idx}`}
                  className="px-4 py-2.5"
                  style={{
                    borderBottom:
                      idx < lineItems.length - 1
                        ? "1px solid var(--color-border-default)"
                        : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: "var(--color-accent-subtle)",
                    }}
                  >
                    {item.type === "service" ? (
                      <Scissors size={12} style={{ color: "var(--color-accent)" }} />
                    ) : (
                      <ShoppingBag size={12} style={{ color: "var(--color-accent)" }} />
                    )}
                  </div>
                  <span
                    className="flex-1 text-sm truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemQty(idx, parseInt(e.target.value, 10) || 1)}
                      className="w-10 px-1 py-1 rounded text-center text-xs"
                      style={{
                        background: "var(--color-bg-input)",
                        color: "var(--color-text-primary)",
                        border: "1px solid var(--color-border-default)",
                        outline: "none",
                      }}
                    />
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>×</span>
                    <div className="flex items-center gap-0.5">
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                        className="w-16 px-1 py-1 rounded text-right text-xs"
                        style={{
                          background: "var(--color-bg-input)",
                          color: "var(--color-accent)",
                          border: "1px solid var(--color-border-default)",
                          outline: "none",
                        }}
                      />
                    </div>
                    <span
                      className="text-sm font-medium w-14 text-right"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {formatPrice(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1 rounded transition-colors cursor-pointer"
                      style={{
                        color: "var(--color-text-muted)",
                        background: "none",
                        border: "none",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  </div>
                  {/* Stylist selector — services only */}
                  {item.type === "service" && allStylists.length > 0 && (
                    <div className="mt-1 flex items-center gap-2 pl-8">
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
            </div>
          )}
        </div>

        {/* Manual amount (only if no line items) */}
        {lineItems.length === 0 && (
          <Input
            label={`${t("admin", "amount")} (USD) *`}
            type="number"
            min="0"
            step="0.01"
            value={manualAmount}
            onChange={(e) => {
              setManualAmount(e.target.value);
              if (errors.amount)
                setErrors((prev) => ({ ...prev, amount: undefined }));
            }}
            placeholder="0.00"
            error={errors.amount}
          />
        )}

        {/* Due Date + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="w-full">
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t("admin", "dueDate")}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg transition-all duration-200"
              style={{
                background: "var(--color-bg-input)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-default)",
                outline: "none",
                colorScheme: "dark",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div className="w-full">
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t("admin", "status")}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
              className="w-full px-4 py-3 rounded-lg transition-all duration-200"
              style={{
                background: "var(--color-bg-input)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-default)",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Discount field */}
        {baseSubtotal > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: "var(--color-bg-glass)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <Tag size={14} style={{ color: "var(--color-accent)" }} />
            <span className="text-sm flex-1" style={{ color: "var(--color-text-secondary)" }}>
              {language === "es" ? "Descuento (%)" : "Discount (%)"}
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDiscount(pct)}
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
                onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                placeholder="0"
                className="w-12 text-center text-sm rounded-md px-2 py-1"
                style={{
                  background: "var(--color-bg-input)",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-primary)",
                  outline: "none",
                }}
              />
            </div>
          </div>
        )}

        {/* Tax breakdown preview */}
        {baseSubtotal > 0 && (
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
                  {language === "es" ? "Subtotal" : "Subtotal"}
                </span>
                <span className="text-sm tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                  {formatPrice(baseSubtotal)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1" style={{ color: "#22c55e" }}>
                    <Tag size={11} />
                    {language === "es" ? `Descuento ${discount}%` : `Discount ${discount}%`}
                  </span>
                  <span className="text-sm tabular-nums" style={{ color: "#22c55e" }}>
                    -{formatPrice(discountAmount)}
                  </span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {language === "es" ? "Después de descuento" : "After discount"}
                  </span>
                  <span className="text-sm tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                    {formatPrice(afterDiscount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  ITBMS (7%)
                </span>
                <span className="text-sm tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                  +{formatPrice(taxAmount)}
                </span>
              </div>
            </div>
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderTop: "1px solid var(--color-border-accent)",
                background: "var(--color-accent-subtle)",
              }}
            >
              <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {language === "es" ? "Total a cobrar" : "Invoice Total"}
              </span>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-accent)" }}
              >
                {formatPrice(finalAmount)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          className="flex justify-end gap-3 pt-4"
          style={{ borderTop: "1px solid var(--color-border-default)" }}
        >
          <Button variant="ghost" onClick={onClose}>
            {t("common", "cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {t("common", "save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
