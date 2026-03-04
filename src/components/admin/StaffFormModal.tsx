"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useLanguage } from "@/providers/LanguageProvider";
import { services } from "@/data/services";
import { formatServicePrice } from "@/lib/utils";
import type { Stylist, StylistSchedule, ServiceCommission } from "@/types";

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  stylist?: Stylist;
  onSave: (data: Omit<Stylist, "id">) => void;
}

const DAY_NAMES_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_NAMES_ES = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

function getDefaultSchedule(): StylistSchedule[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i + 1,
    startTime: "09:00",
    endTime: "18:00",
    isAvailable: i < 5, // Mon-Fri available, Sat-Sun not
  }));
}

export default function StaffFormModal({
  isOpen,
  onClose,
  stylist,
  onSave,
}: StaffFormModalProps) {
  const { language, t } = useLanguage();
  const isEditing = !!stylist;

  const [name, setName] = useState("");
  const [roleEn, setRoleEn] = useState("");
  const [roleEs, setRoleEs] = useState("");
  const [bioEn, setBioEn] = useState("");
  const [bioEs, setBioEs] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [avatar, setAvatar] = useState("");
  const [instagram, setInstagram] = useState("");
  const [defaultCommission, setDefaultCommission] = useState(40);
  const [linkedPhone, setLinkedPhone] = useState("");
  const [serviceCommissionOverrides, setServiceCommissionOverrides] = useState<Record<string, number>>({});
  const [schedule, setSchedule] = useState<StylistSchedule[]>(getDefaultSchedule());
  const [errors, setErrors] = useState<{ name?: string; services?: string }>({});

  // Reset form when modal opens or stylist changes
  useEffect(() => {
    if (isOpen) {
      if (stylist) {
        setName(stylist.name);
        setRoleEn(stylist.role.en);
        setRoleEs(stylist.role.es);
        setBioEn(stylist.bio.en);
        setBioEs(stylist.bio.es);
        setSpecialties(stylist.specialties.join(", "));
        setSelectedServiceIds([...stylist.serviceIds]);
        setAvatar(stylist.avatar);
        setInstagram(stylist.instagram || "");
        setDefaultCommission(stylist.defaultCommission ?? 40);
        setLinkedPhone(stylist.linkedPhone || "");
        setServiceCommissionOverrides(
          (stylist.serviceCommissions || []).reduce((acc, sc) => ({ ...acc, [sc.serviceId]: sc.percentage }), {} as Record<string, number>)
        );
        setSchedule(
          stylist.schedule.length > 0
            ? stylist.schedule.map((s) => ({ ...s }))
            : getDefaultSchedule()
        );
      } else {
        setName("");
        setRoleEn("");
        setRoleEs("");
        setBioEn("");
        setBioEs("");
        setSpecialties("");
        setSelectedServiceIds([]);
        setAvatar("");
        setInstagram("");
        setDefaultCommission(40);
        setLinkedPhone("");
        setServiceCommissionOverrides({});
        setSchedule(getDefaultSchedule());
      }
      setErrors({});
    }
  }, [isOpen, stylist]);

  const toggleService = useCallback((serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  }, []);

  const updateScheduleDay = useCallback(
    (dayIndex: number, field: keyof StylistSchedule, value: string | boolean) => {
      setSchedule((prev) =>
        prev.map((day, i) =>
          i === dayIndex ? { ...day, [field]: value } : day
        )
      );
    },
    []
  );

  const handleSubmit = () => {
    const newErrors: { name?: string; services?: string } = {};

    if (!name.trim()) {
      newErrors.name = language === "en" ? "Name is required" : "El nombre es requerido";
    }
    if (selectedServiceIds.length === 0) {
      newErrors.services =
        language === "en"
          ? "Select at least one service"
          : "Selecciona al menos un servicio";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const data: Omit<Stylist, "id"> = {
      name: name.trim(),
      role: { en: roleEn.trim(), es: roleEs.trim() },
      bio: { en: bioEn.trim(), es: bioEs.trim() },
      avatar: avatar.trim(),
      specialties: specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      serviceIds: selectedServiceIds,
      rating: stylist?.rating ?? 5.0,
      reviewCount: stylist?.reviewCount ?? 0,
      schedule,
      ...(instagram.trim() ? { instagram: instagram.trim() } : {}),
      defaultCommission,
      ...(linkedPhone.trim() ? { linkedPhone: linkedPhone.trim() } : {}),
      serviceCommissions: Object.entries(serviceCommissionOverrides)
        .filter(([serviceId, pct]) => selectedServiceIds.includes(serviceId) && pct !== defaultCommission)
        .map(([serviceId, percentage]) => ({ serviceId, percentage })),
    };

    onSave(data);
    onClose();
  };

  const dayNames = language === "en" ? DAY_NAMES_EN : DAY_NAMES_ES;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t("admin", "editDetails") : t("admin", "addStaff")}
      size="lg"
    >
      <div className="space-y-6">
        {/* Full Name */}
        <Input
          label={t("admin", "staffName")}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder={language === "en" ? "e.g. Isabella Martinez" : "ej. Isabella Martinez"}
          error={errors.name}
        />

        {/* Role EN + ES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`${t("admin", "staffRole")} (EN)`}
            value={roleEn}
            onChange={(e) => setRoleEn(e.target.value)}
            placeholder="e.g. Senior Stylist"
          />
          <Input
            label={`${t("admin", "staffRole")} (ES)`}
            value={roleEs}
            onChange={(e) => setRoleEs(e.target.value)}
            placeholder="ej. Estilista Senior"
          />
        </div>

        {/* Bio EN + ES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="w-full">
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}
            >
              {t("admin", "staffBio")} (EN)
            </label>
            <textarea
              value={bioEn}
              onChange={(e) => setBioEn(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg transition-all duration-200 resize-none"
              style={{
                background: "var(--color-bg-input)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-default)",
                outline: "none",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
              placeholder="Brief bio in English..."
            />
          </div>
          <div className="w-full">
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}
            >
              {t("admin", "staffBio")} (ES)
            </label>
            <textarea
              value={bioEs}
              onChange={(e) => setBioEs(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg transition-all duration-200 resize-none"
              style={{
                background: "var(--color-bg-input)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-default)",
                outline: "none",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
              placeholder="Biografia breve en espanol..."
            />
          </div>
        </div>

        {/* Specialties */}
        <div>
          <Input
            label={t("admin", "staffSpecialties")}
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder={
              language === "en"
                ? "e.g. Balayage, Color Correction, Bridal"
                : "ej. Balayage, Correccion de Color, Novias"
            }
          />
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}
          >
            {language === "en"
              ? "Separate multiple specialties with commas"
              : "Separa las especialidades con comas"}
          </p>
        </div>

        {/* Services Multi-Select Checkboxes */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}
          >
            {t("admin", "staffServices")} *
          </label>
          <div
            className="rounded-lg p-3 max-h-48 overflow-y-auto space-y-1"
            style={{
              background: "var(--color-bg-input)",
              border: errors.services
                ? "1px solid #ef4444"
                : "1px solid var(--color-border-default)",
              transition: "all 0.3s ease",
            }}
          >
            {services.map((service) => (
              <label
                key={service.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors"
                style={{ transition: "all 0.2s ease" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-bg-glass)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedServiceIds.includes(service.id)}
                  onChange={() => toggleService(service.id)}
                  className="w-4 h-4 rounded accent-current"
                  style={{ accentColor: "var(--color-accent)" }}
                />
                <span
                  className="flex-1 text-sm"
                  style={{ color: "var(--color-text-primary)", transition: "color 0.3s ease" }}
                >
                  {service.name[language]}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--color-accent)", transition: "color 0.3s ease" }}
                >
                  {formatServicePrice(service.price, service.priceMax)}
                </span>
              </label>
            ))}
          </div>
          {errors.services && (
            <p className="mt-1 text-sm" style={{ color: "#ef4444" }}>
              {errors.services}
            </p>
          )}
        </div>

        {/* Avatar URL + Preview */}
        <div>
          <Input
            label={t("admin", "staffAvatar")}
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://images.unsplash.com/..."
          />
          {avatar.trim() && (
            <div className="mt-2 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                style={{
                  border: "2px solid var(--color-border-default)",
                  background: "var(--color-bg-glass)",
                  transition: "all 0.3s ease",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatar}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <span
                className="text-xs"
                style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}
              >
                {language === "en" ? "Preview" : "Vista previa"}
              </span>
            </div>
          )}
        </div>

        {/* Instagram */}
        <Input
          label={t("admin", "staffInstagram")}
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@username"
        />

        {/* Linked Phone */}
        <Input
          label={t("admin", "linkedPhone")}
          value={linkedPhone}
          onChange={(e) => setLinkedPhone(e.target.value.replace(/\D/g, ""))}
          placeholder="5552003000"
        />

        {/* Default Commission */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}>
            {t("admin", "defaultCommission")}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={100}
              value={defaultCommission}
              onChange={(e) => setDefaultCommission(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              className="w-24 px-4 py-3 rounded-lg"
              style={{
                background: "var(--color-bg-input)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-default)",
                outline: "none",
                transition: "all 0.3s ease",
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
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>%</span>
          </div>
        </div>

        {/* Service Commission Overrides */}
        {selectedServiceIds.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}>
              {t("admin", "serviceCommissions")}
            </label>
            <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
              {language === "en"
                ? `Override commission for specific services. Default: ${defaultCommission}%`
                : `Personaliza la comisión por servicio. Por defecto: ${defaultCommission}%`}
            </p>
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border-default)", background: "var(--color-bg-input)", transition: "all 0.3s ease" }}>
              {selectedServiceIds.map((serviceId, idx) => {
                const service = services.find((s) => s.id === serviceId);
                if (!service) return null;
                const hasOverride = serviceId in serviceCommissionOverrides;
                return (
                  <div
                    key={serviceId}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      borderBottom: idx < selectedServiceIds.length - 1 ? "1px solid var(--color-border-default)" : "none",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span className="flex-1 text-sm" style={{ color: "var(--color-text-primary)" }}>
                      {service.name[language]}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={hasOverride ? serviceCommissionOverrides[serviceId] : defaultCommission}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                          setServiceCommissionOverrides((prev) => ({ ...prev, [serviceId]: val }));
                        }}
                        className="w-16 px-2 py-1 rounded text-sm text-center"
                        style={{
                          background: "var(--color-bg-card)",
                          color: "var(--color-text-primary)",
                          border: hasOverride ? "1px solid var(--color-accent)" : "1px solid var(--color-border-default)",
                          outline: "none",
                          transition: "all 0.3s ease",
                        }}
                      />
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>%</span>
                      {hasOverride && (
                        <button
                          type="button"
                          onClick={() => setServiceCommissionOverrides((prev) => {
                            const next = { ...prev };
                            delete next[serviceId];
                            return next;
                          })}
                          className="text-xs px-2 py-1 rounded cursor-pointer"
                          style={{ color: "var(--color-text-muted)", transition: "color 0.2s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                        >
                          {language === "en" ? "Reset" : "Reset"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Schedule Editor */}
        <div>
          <label
            className="block text-sm font-medium mb-3"
            style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}
          >
            {t("admin", "editSchedule")}
          </label>
          <div
            className="rounded-lg overflow-hidden"
            style={{
              border: "1px solid var(--color-border-default)",
              background: "var(--color-bg-input)",
              transition: "all 0.3s ease",
            }}
          >
            {schedule.map((day, index) => (
              <div
                key={day.dayOfWeek}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom:
                    index < schedule.length - 1
                      ? "1px solid var(--color-border-default)"
                      : "none",
                  opacity: day.isAvailable ? 1 : 0.5,
                  transition: "all 0.3s ease",
                }}
              >
                {/* Day Name */}
                <span
                  className="w-20 text-sm font-medium flex-shrink-0"
                  style={{ color: "var(--color-text-primary)", transition: "color 0.3s ease" }}
                >
                  {dayNames[index]}
                </span>

                {/* Available Toggle */}
                <label className="flex items-center gap-2 flex-shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.isAvailable}
                    onChange={(e) =>
                      updateScheduleDay(index, "isAvailable", e.target.checked)
                    }
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "var(--color-accent)" }}
                  />
                  <span
                    className="text-xs"
                    style={{
                      color: "var(--color-text-muted)",
                      transition: "color 0.3s ease",
                    }}
                  >
                    {language === "en" ? "Available" : "Disponible"}
                  </span>
                </label>

                {/* Time Inputs */}
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="time"
                    value={day.startTime}
                    onChange={(e) =>
                      updateScheduleDay(index, "startTime", e.target.value)
                    }
                    disabled={!day.isAvailable}
                    className="px-2 py-1 rounded text-sm"
                    style={{
                      background: "var(--color-bg-card)",
                      color: "var(--color-text-primary)",
                      border: "1px solid var(--color-border-default)",
                      outline: "none",
                      transition: "all 0.3s ease",
                    }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    -
                  </span>
                  <input
                    type="time"
                    value={day.endTime}
                    onChange={(e) =>
                      updateScheduleDay(index, "endTime", e.target.value)
                    }
                    disabled={!day.isAvailable}
                    className="px-2 py-1 rounded text-sm"
                    style={{
                      background: "var(--color-bg-card)",
                      color: "var(--color-text-primary)",
                      border: "1px solid var(--color-border-default)",
                      outline: "none",
                      transition: "all 0.3s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

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
