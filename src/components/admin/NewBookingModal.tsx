"use client";

import { localIsoDate } from "@/lib/date-utils";
import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { useStaff } from "@/providers/StaffProvider";
import { useEventBus } from "@/providers/EventBusProvider";
import { services as liveServices } from "@/data/services";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import { setDocument } from "@/lib/firestore";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { Booking, User } from "@/types";

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (booking: Booking) => void;
}

export default function NewBookingModal({ isOpen, onClose, onCreated }: NewBookingModalProps) {
  const { language } = useLanguage();
  const { addToast } = useToast();
  const { allStylists } = useStaff();
  const { emit } = useEventBus();

  const [mode, setMode] = useState<"existing" | "walkin">("existing");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientSearch, setClientSearch] = useState("");
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [stylistId, setStylistId] = useState<string>("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [notes, setNotes] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setMode("existing");
      setSelectedClientId("");
      setClientSearch("");
      setWalkinName("");
      setWalkinPhone("");
      setStylistId(allStylists[0]?.id ?? "");
      setSelectedServiceIds([]);
      setBookingDate("");
      setBookingTime("");
      setNotes("");
      setSaving(false);
      setUsers(getStoredData<User[]>("mila-users", []));
    }
  }, [isOpen, allStylists]);

  const stylist = useMemo(
    () => allStylists.find((s) => s.id === stylistId) ?? null,
    [allStylists, stylistId]
  );

  const filteredUsers = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return users.slice(0, 20);
    return users
      .filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(q) ||
          (u.phone ?? "").includes(q)
      )
      .slice(0, 20);
  }, [users, clientSearch]);

  const selectedServices = useMemo(
    () => liveServices.filter((s) => selectedServiceIds.includes(s.id)),
    [selectedServiceIds]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.durationMinutes ?? 30), 0),
    [selectedServices]
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.price ?? 0), 0),
    [selectedServices]
  );

  // Generate available time slots
  const availableSlots = useMemo(() => {
    if (!stylist || !bookingDate || selectedServiceIds.length === 0) return [];
    const date = new Date(bookingDate + "T12:00:00");
    const dayOfWeek = date.getDay();
    const schedule = stylist.schedule?.find(
      (s) => s.dayOfWeek === dayOfWeek && s.isAvailable
    );
    if (!schedule) return [];

    const existingBookings = getStoredData<Booking[]>("mila-bookings", []).filter(
      (b) =>
        b.stylistId === stylist.id &&
        b.date === bookingDate &&
        (b.status === "confirmed" || b.status === "pending")
    );

    const slots: string[] = [];
    const [startH, startM] = schedule.startTime.split(":").map(Number);
    const [endH, endM] = schedule.endTime.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    for (let m = startMin; m + totalDuration <= endMin; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const slotStart = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      const slotEndMin = m + totalDuration;
      const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, "0")}:${String(
        slotEndMin % 60
      ).padStart(2, "0")}`;

      const conflict = existingBookings.some((b) => {
        if (!b.startTime || !b.endTime) return false;
        return slotStart < b.endTime && slotEnd > b.startTime;
      });

      if (!conflict) slots.push(slotStart);
    }
    return slots;
  }, [stylist, bookingDate, selectedServiceIds.length, totalDuration]);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Resolve client
      let clientId = "";
      let clientName = "";

      if (mode === "existing") {
        if (!selectedClientId) {
          addToast(language === "es" ? "Selecciona un cliente" : "Select a client", "error");
          setSaving(false);
          return;
        }
        const user = users.find((u) => u.id === selectedClientId);
        if (!user) {
          addToast(language === "es" ? "Cliente no encontrado" : "Client not found", "error");
          setSaving(false);
          return;
        }
        clientId = user.id;
        clientName = user.name;
      } else {
        const name = walkinName.trim();
        const phone = walkinPhone.trim();
        if (!name || !phone) {
          addToast(
            language === "es" ? "Nombre y teléfono requeridos" : "Name and phone required",
            "error"
          );
          setSaving(false);
          return;
        }
        const existingUser = users.find((u) => u.phone === phone);
        if (existingUser) {
          clientId = existingUser.id;
          clientName = existingUser.name;
        } else {
          clientId = `user-${phone}`;
          clientName = name;
          const newUser: User = {
            id: clientId,
            name,
            phone,
            countryCode: "+507",
            role: "client",
            createdAt: new Date().toISOString(),
          };
          const nextUsers = [...users, newUser];
          setStoredData("mila-users", nextUsers);
          setDocument("users", clientId, {
            name: newUser.name,
            phone: newUser.phone,
            countryCode: newUser.countryCode,
            role: newUser.role,
            createdAt: newUser.createdAt,
          }).catch((err) => console.warn("[Mila] User sync failed:", err));
        }
      }

      if (!stylist || !bookingDate || !bookingTime || selectedServiceIds.length === 0) {
        addToast(
          language === "es" ? "Completa todos los campos" : "Complete all fields",
          "error"
        );
        setSaving(false);
        return;
      }

      // Calculate endTime
      const [sh, sm] = bookingTime.split(":").map(Number);
      const endMinAbs = sh * 60 + sm + totalDuration;
      const endTime = `${String(Math.floor(endMinAbs / 60)).padStart(2, "0")}:${String(
        endMinAbs % 60
      ).padStart(2, "0")}`;

      // Final conflict check
      const allBookings = getStoredData<Booking[]>("mila-bookings", []);
      const hasConflict = allBookings.some(
        (b) =>
          b.stylistId === stylist.id &&
          b.date === bookingDate &&
          (b.status === "confirmed" || b.status === "pending") &&
          b.startTime &&
          b.endTime &&
          bookingTime < b.endTime &&
          endTime > b.startTime
      );
      if (hasConflict) {
        addToast(
          language === "es"
            ? "Este horario ya está reservado"
            : "This time slot is already booked",
          "error"
        );
        setSaving(false);
        return;
      }

      const booking: Booking = {
        id: `book-${generateId()}`,
        clientId,
        clientName,
        stylistId: stylist.id,
        stylistName: stylist.name,
        serviceIds: selectedServiceIds,
        date: bookingDate,
        startTime: bookingTime,
        endTime,
        status: "confirmed",
        totalPrice,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      } as Booking;

      const nextBookings = [...allBookings, booking];
      setStoredData("mila-bookings", nextBookings);

      const { id, ...bookingData } = booking;
      setDocument("bookings", id, bookingData).catch((err) =>
        console.warn("[Mila] Booking sync failed:", err)
      );

      emit("booking:updated", booking);

      addToast(language === "es" ? "Cita creada" : "Booking created", "success");
      onCreated(booking);
      onClose();
    } catch (err) {
      console.error("[Mila] NewBookingModal save error:", err);
      addToast(language === "es" ? "Error al guardar" : "Save error", "error");
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === "es" ? "Nueva Cita" : "New Booking"}
      size="lg"
    >
      <div className="space-y-5">
        {/* Client Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("existing")}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background:
                mode === "existing" ? "var(--gradient-accent)" : "var(--color-bg-glass)",
              color: mode === "existing" ? "var(--color-text-inverse)" : "var(--color-text-primary)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            {language === "es" ? "Cliente existente" : "Existing client"}
          </button>
          <button
            onClick={() => setMode("walkin")}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background:
                mode === "walkin" ? "var(--gradient-accent)" : "var(--color-bg-glass)",
              color: mode === "walkin" ? "var(--color-text-inverse)" : "var(--color-text-primary)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            {language === "es" ? "Walk-in" : "Walk-in"}
          </button>
        </div>

        {/* Client picker */}
        {mode === "existing" ? (
          <div>
            <Input
              label={language === "es" ? "Buscar cliente" : "Search client"}
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder={language === "es" ? "Nombre o teléfono" : "Name or phone"}
            />
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border-default">
              {filteredUsers.length === 0 ? (
                <p className="p-3 text-xs text-center text-text-muted">
                  {language === "es" ? "Sin resultados" : "No results"}
                </p>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedClientId(u.id)}
                    className="w-full text-left px-3 py-2 text-sm transition-colors"
                    style={{
                      background:
                        selectedClientId === u.id ? "var(--color-accent-subtle)" : "transparent",
                      color: "var(--color-text-primary)",
                      borderBottom: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-text-muted">{u.phone}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={language === "es" ? "Nombre" : "Name"}
              value={walkinName}
              onChange={(e) => setWalkinName(e.target.value)}
              placeholder={language === "es" ? "Nombre completo" : "Full name"}
            />
            <Input
              label={language === "es" ? "Teléfono" : "Phone"}
              value={walkinPhone}
              onChange={(e) => setWalkinPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="6000 0000"
            />
          </div>
        )}

        {/* Stylist */}
        <div>
          <label
            className="block mb-1.5 text-xs uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {language === "es" ? "Estilista" : "Stylist"}
          </label>
          <select
            value={stylistId}
            onChange={(e) => setStylistId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{
              background: "var(--color-bg-input)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
            }}
          >
            {allStylists.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Services */}
        <div>
          <label
            className="block mb-1.5 text-xs uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {language === "es" ? "Servicios" : "Services"}
          </label>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border-default p-2 space-y-1">
            {liveServices.map((svc) => {
              const selected = selectedServiceIds.includes(svc.id);
              return (
                <label
                  key={svc.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm"
                  style={{
                    background: selected ? "var(--color-accent-subtle)" : "transparent",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleService(svc.id)}
                  />
                  <span className="flex-1">{svc.name?.[language] ?? svc.id}</span>
                  <span className="text-xs text-text-muted">
                    {svc.durationMinutes ?? 30}min · ${svc.price ?? 0}
                  </span>
                </label>
              );
            })}
          </div>
          {selectedServices.length > 0 && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-accent)" }}>
              {language === "es" ? "Total" : "Total"}: ${totalPrice.toFixed(2)} ·{" "}
              {totalDuration} min
            </p>
          )}
        </div>

        {/* Date */}
        <Input
          label={language === "es" ? "Fecha" : "Date"}
          type="date"
          value={bookingDate}
          onChange={(e) => setBookingDate(e.target.value)}
          min={localIsoDate()}
        />

        {/* Time slots */}
        {bookingDate && selectedServiceIds.length > 0 && (
          <div>
            <label
              className="block mb-1.5 text-xs uppercase tracking-wider"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {language === "es" ? "Hora" : "Time"}
            </label>
            {availableSlots.length === 0 ? (
              <p className="text-xs text-text-muted">
                {language === "es" ? "Sin horarios disponibles" : "No available slots"}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setBookingTime(slot)}
                    className="py-2 rounded-lg text-xs font-medium"
                    style={{
                      background:
                        bookingTime === slot
                          ? "var(--gradient-accent)"
                          : "var(--color-bg-glass)",
                      color:
                        bookingTime === slot
                          ? "var(--color-text-inverse)"
                          : "var(--color-text-primary)",
                      border: "1px solid var(--color-border-default)",
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label
            className="block mb-1.5 text-xs uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {language === "es" ? "Notas (opcional)" : "Notes (optional)"}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--color-bg-input)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
              resize: "vertical",
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border-default">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            {language === "es" ? "Cancelar" : "Cancel"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving
              ? language === "es"
                ? "Guardando..."
                : "Saving..."
              : language === "es"
              ? "Crear Cita"
              : "Create Booking"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
