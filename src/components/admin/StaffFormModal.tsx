"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useLanguage } from "@/providers/LanguageProvider";
import { services } from "@/data/services";
import { formatServicePrice } from "@/lib/utils";
import { Upload, X, ImageIcon } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 1080;
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = (h / w) * maxSize; w = maxSize; }
          else { w = (w / h) * maxSize; h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, w, h);
          setAvatar(canvas.toDataURL("image/jpeg", 0.92));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

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

        {/* Avatar Upload */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}
          >
            {t("admin", "staffAvatar")}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = "";
            }}
          />

          {avatar.trim() ? (
            /* Preview with change/remove */
            <div className="flex items-center gap-4">
              <div
                className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 group"
                style={{
                  border: "2px solid var(--color-border-accent)",
                  background: "var(--color-bg-glass)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    color: "var(--color-accent)",
                    border: "1px solid var(--color-border-default)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-accent)";
                    e.currentTarget.style.background = "var(--color-accent-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border-default)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Upload size={12} />
                  {language === "en" ? "Change" : "Cambiar"}
                </button>
                <button
                  type="button"
                  onClick={() => setAvatar("")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    color: "var(--color-text-muted)",
                    border: "1px solid var(--color-border-default)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#9B4D4D";
                    e.currentTarget.style.borderColor = "#9B4D4D";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--color-text-muted)";
                    e.currentTarget.style.borderColor = "var(--color-border-default)";
                  }}
                >
                  <X size={12} />
                  {language === "en" ? "Remove" : "Eliminar"}
                </button>
              </div>
            </div>
          ) : (
            /* Upload drop zone */
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl cursor-pointer transition-all"
              style={{
                border: isDragging ? "2px dashed var(--color-accent)" : "2px dashed var(--color-border-default)",
                background: isDragging ? "var(--color-accent-subtle)" : "var(--color-bg-input)",
                transition: "all 0.25s ease",
              }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 40,
                  height: 40,
                  background: "var(--color-bg-glass)",
                  border: "1px solid var(--color-border-default)",
                }}
              >
                <ImageIcon size={18} style={{ color: "var(--color-text-muted)" }} />
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                {language === "en" ? "Upload photo" : "Subir foto"}
              </p>
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                {language === "en" ? "Drag & drop or click to browse · Max 5MB" : "Arrastra o haz clic para buscar · Máx 5MB"}
              </p>
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
