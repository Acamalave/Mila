"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useLanguage } from "@/providers/LanguageProvider";
import { services } from "@/data/services";
import { formatPrice } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types";

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice;
  onSave: (data: Omit<Invoice, "id" | "createdAt">) => void;
}

function generateClientId(name: string): string {
  return `client-${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
}

export default function InvoiceFormModal({
  isOpen,
  onClose,
  invoice,
  onSave,
}: InvoiceFormModalProps) {
  const { language, t } = useLanguage();
  const isEditing = !!invoice;

  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descEs, setDescEs] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [errors, setErrors] = useState<{ clientName?: string; amount?: string }>({});

  // Reset form when modal opens or invoice changes
  useEffect(() => {
    if (isOpen) {
      if (invoice) {
        setClientName(invoice.clientName);
        setClientId(invoice.clientId);
        setServiceId(invoice.serviceId || "");
        setDescEn(invoice.description?.en || "");
        setDescEs(invoice.description?.es || "");
        setAmount(String(invoice.amount));
        setDueDate(invoice.dueDate || "");
        setStatus(invoice.status);
      } else {
        setClientName("");
        setClientId("");
        setServiceId("");
        setDescEn("");
        setDescEs("");
        setAmount("");
        setDueDate("");
        setStatus("draft");
      }
      setErrors({});
    }
  }, [isOpen, invoice]);

  // Auto-generate client ID from name (only when not editing)
  useEffect(() => {
    if (!isEditing && clientName.trim()) {
      setClientId(generateClientId(clientName));
    }
  }, [clientName, isEditing]);

  // Auto-fill amount when service selected
  const handleServiceChange = (newServiceId: string) => {
    setServiceId(newServiceId);
    if (newServiceId) {
      const selectedService = services.find((s) => s.id === newServiceId);
      if (selectedService && !amount) {
        setAmount(String(selectedService.price));
      }
    }
  };

  const serviceOptions = [
    { value: "", label: language === "en" ? "-- No service --" : "-- Sin servicio --" },
    ...services.map((s) => ({
      value: s.id,
      label: `${s.name[language]} (${formatPrice(s.price)})`,
    })),
  ];

  const handleSubmit = () => {
    const newErrors: { clientName?: string; amount?: string } = {};

    if (!clientName.trim()) {
      newErrors.clientName =
        language === "en" ? "Client name is required" : "El nombre del cliente es requerido";
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount =
        language === "en" ? "Valid amount is required" : "Se requiere un monto valido";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const data: Omit<Invoice, "id" | "createdAt"> = {
      clientName: clientName.trim(),
      clientId: clientId.trim() || generateClientId(clientName),
      amount: Number(amount),
      status,
      date: new Date().toISOString().split("T")[0],
      ...(serviceId ? { serviceId } : {}),
      ...(descEn.trim() || descEs.trim()
        ? { description: { en: descEn.trim(), es: descEs.trim() } }
        : {}),
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t("admin", "editInvoice") : t("admin", "createInvoice")}
      size="md"
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

        {/* Service Select */}
        <Select
          label={t("admin", "service")}
          options={serviceOptions}
          value={serviceId}
          onChange={(e) => handleServiceChange(e.target.value)}
          placeholder={language === "en" ? "Select a service" : "Selecciona un servicio"}
        />

        {/* Description EN + ES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`${t("admin", "description")} (EN)`}
            value={descEn}
            onChange={(e) => setDescEn(e.target.value)}
            placeholder="Description in English"
          />
          <Input
            label={`${t("admin", "description")} (ES)`}
            value={descEs}
            onChange={(e) => setDescEs(e.target.value)}
            placeholder="Descripcion en espanol"
          />
        </div>

        {/* Amount */}
        <Input
          label={`${t("admin", "amount")} (USD) *`}
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (errors.amount)
              setErrors((prev) => ({ ...prev, amount: undefined }));
          }}
          placeholder="0.00"
          error={errors.amount}
        />

        {/* Due Date */}
        <div className="w-full">
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}
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
              transition: "all 0.3s ease",
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

        {/* Amount Preview */}
        {amount && Number(amount) > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-lg"
            style={{
              background: "var(--color-bg-glass)",
              border: "1px solid var(--color-border-default)",
              transition: "all 0.3s ease",
            }}
          >
            <span
              className="text-sm"
              style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}
            >
              {language === "en" ? "Invoice Total" : "Total de Factura"}
            </span>
            <span
              className="text-lg font-semibold"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-accent)",
                transition: "color 0.3s ease",
              }}
            >
              {formatPrice(Number(amount))}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div
          className="flex justify-end gap-3 pt-4"
          style={{
            borderTop: "1px solid var(--color-border-default)",
            transition: "all 0.3s ease",
          }}
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
