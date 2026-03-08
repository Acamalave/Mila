"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { getStoredData } from "@/lib/utils";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Search, UserPlus, Check, Phone } from "lucide-react";
import type { Booking } from "@/types";

export interface POSClient {
  id: string;
  name: string;
  phone?: string;
}

interface POSClientSelectorProps {
  selected: POSClient | null;
  onSelect: (client: POSClient) => void;
}

export default function POSClientSelector({
  selected,
  onSelect,
}: POSClientSelectorProps) {
  const { language, t } = useLanguage();
  const { invoices } = useInvoices();
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Build client list from bookings + invoices
  const clients = useMemo(() => {
    const map = new Map<string, POSClient>();

    // From bookings
    const bookings = getStoredData<Booking[]>("mila-bookings", []);
    for (const b of bookings) {
      if (b.clientId && !map.has(b.clientId)) {
        map.set(b.clientId, {
          id: b.clientId,
          name: b.guestName || b.clientId,
          phone: b.guestPhone,
        });
      }
    }

    // From invoices
    for (const inv of invoices) {
      if (inv.clientId && !map.has(inv.clientId)) {
        map.set(inv.clientId, {
          id: inv.clientId,
          name: inv.clientName,
        });
      }
    }

    // Mock users
    if (!map.has("user-sofia")) {
      map.set("user-sofia", {
        id: "user-sofia",
        name: "Sofia Chen",
        phone: "5553004000",
      });
    }
    if (!map.has("user-admin")) {
      map.set("user-admin", {
        id: "user-admin",
        name: "Isabella Martinez",
        phone: "5551002000",
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [invoices]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    );
  }, [clients, search]);

  const handleAddClient = () => {
    if (!newName.trim()) return;
    const id = `client-${newName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
    onSelect({ id, name: newName.trim(), phone: newPhone.trim() || undefined });
    setShowNewForm(false);
    setNewName("");
    setNewPhone("");
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: "var(--color-text-muted)" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("pos", "searchClient")}
          className="w-full pl-11 pr-4 py-3 rounded-lg transition-all duration-200"
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

      {/* Client List */}
      <div
        className="rounded-xl overflow-hidden divide-y"
        style={{
          border: "1px solid var(--color-border-default)",
          background: "var(--color-bg-glass)",
        }}
      >
        {filtered.length === 0 && !showNewForm ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {language === "es"
                ? "No se encontraron clientes"
                : "No clients found"}
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto" style={{ borderColor: "var(--color-border-default)" }}>
            {filtered.map((client) => {
              const isSelected = selected?.id === client.id;
              return (
                <motion.button
                  key={client.id}
                  onClick={() => onSelect(client)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all cursor-pointer"
                  style={{
                    background: isSelected
                      ? "var(--color-accent-subtle)"
                      : "transparent",
                    borderBottom: "1px solid var(--color-border-default)",
                    border: "none",
                    borderBlockEnd: "1px solid var(--color-border-default)",
                    color: "var(--color-text-primary)",
                  }}
                  whileHover={{ backgroundColor: "var(--color-bg-glass-selected)" }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: isSelected
                        ? "var(--color-accent-subtle)"
                        : "var(--color-bg-glass)",
                      border: isSelected
                        ? "1px solid var(--color-border-accent)"
                        : "1px solid var(--color-border-default)",
                    }}
                  >
                    {isSelected ? (
                      <Check size={16} style={{ color: "var(--color-accent)" }} />
                    ) : (
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{
                        color: isSelected
                          ? "var(--color-accent)"
                          : "var(--color-text-primary)",
                      }}
                    >
                      {client.name}
                    </p>
                    {client.phone && (
                      <p
                        className="text-xs flex items-center gap-1 mt-0.5"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <Phone size={10} />
                        {client.phone}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* New Client Form */}
      {showNewForm ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-3 p-4 rounded-xl"
          style={{
            background: "var(--color-bg-glass)",
            border: "1px solid var(--color-border-default)",
          }}
        >
          <Input
            label={t("pos", "clientName")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={language === "es" ? "Nombre completo" : "Full name"}
          />
          <Input
            label={t("pos", "clientPhone")}
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="5551234567"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
              {t("common", "cancel")}
            </Button>
            <Button size="sm" onClick={handleAddClient}>
              {t("pos", "addClient")}
            </Button>
          </div>
        </motion.div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNewForm(true)}
          className="w-full"
        >
          <UserPlus size={16} />
          {t("pos", "newClient")}
        </Button>
      )}
    </div>
  );
}
