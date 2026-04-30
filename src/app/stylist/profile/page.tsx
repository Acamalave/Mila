"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { useToast } from "@/providers/ToastProvider";
import { services } from "@/data/services";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { User, Instagram, Star, Clock, Percent, CalendarOff, Plus, Trash2 } from "lucide-react";
import type { StylistSchedule } from "@/types";

const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_NAMES_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const DEFAULT_SCHEDULE: StylistSchedule = {
  dayOfWeek: 0,
  startTime: "09:00",
  endTime: "18:00",
  isAvailable: false,
};

function fillSchedule(schedule: StylistSchedule[] | undefined): StylistSchedule[] {
  // Always return Sun→Sat ordering with defaults filled so the UI shows every day.
  return [0, 1, 2, 3, 4, 5, 6].map(
    (dow) => schedule?.find((s) => s.dayOfWeek === dow) ?? { ...DEFAULT_SCHEDULE, dayOfWeek: dow }
  );
}

export default function StylistProfilePage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const { getStylistByPhone, updateStylist, updateSchedule } = useStaff();

  const stylist = user?.phone ? getStylistByPhone(user.phone) : undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: stylist?.name ?? "",
    bioEn: stylist?.bio?.en ?? "",
    bioEs: stylist?.bio?.es ?? "",
    instagram: stylist?.instagram ?? "",
    avatar: stylist?.avatar ?? "",
    specialties: stylist?.specialties ?? [],
  });
  const [newSpecialty, setNewSpecialty] = useState("");

  const [scheduleEdit, setScheduleEdit] = useState<StylistSchedule[]>(
    fillSchedule(stylist?.schedule)
  );
  const [newBlockedDate, setNewBlockedDate] = useState("");

  const dayNames = language === "es" ? DAY_NAMES_ES : DAY_NAMES_EN;
  const blockedDates = useMemo(() => stylist?.blockedDates ?? [], [stylist]);

  const handleStartEdit = () => {
    if (!stylist) return;
    setEditForm({
      name: stylist.name,
      bioEn: stylist.bio?.en ?? "",
      bioEs: stylist.bio?.es ?? "",
      instagram: stylist.instagram ?? "",
      avatar: stylist.avatar ?? "",
      specialties: [...stylist.specialties],
    });
    setScheduleEdit(fillSchedule(stylist.schedule));
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!stylist) return;
    updateStylist(stylist.id, {
      name: editForm.name,
      bio: { en: editForm.bioEn, es: editForm.bioEs },
      instagram: editForm.instagram,
      avatar: editForm.avatar,
      specialties: editForm.specialties,
    });
    updateSchedule(stylist.id, scheduleEdit);
    setIsEditing(false);
    addToast(language === "es" ? "Perfil actualizado" : "Profile updated", "success");
  };

  const handleCancel = () => setIsEditing(false);

  const addSpecialty = () => {
    const value = newSpecialty.trim();
    if (!value || editForm.specialties.includes(value)) return;
    setEditForm((prev) => ({ ...prev, specialties: [...prev.specialties, value] }));
    setNewSpecialty("");
  };

  const removeSpecialty = (s: string) => {
    setEditForm((prev) => ({ ...prev, specialties: prev.specialties.filter((x) => x !== s) }));
  };

  const updateScheduleField = (
    dow: number,
    field: keyof StylistSchedule,
    value: string | boolean
  ) => {
    setScheduleEdit((prev) =>
      prev.map((s) => (s.dayOfWeek === dow ? { ...s, [field]: value } : s))
    );
  };

  const addBlockedDate = () => {
    if (!stylist || !newBlockedDate) return;
    if (blockedDates.includes(newBlockedDate)) return;
    const next = [...blockedDates, newBlockedDate].sort();
    updateStylist(stylist.id, { blockedDates: next });
    setNewBlockedDate("");
    addToast(language === "es" ? "Día bloqueado" : "Date blocked", "success");
  };

  const removeBlockedDate = (date: string) => {
    if (!stylist) return;
    const next = blockedDates.filter((d) => d !== date);
    updateStylist(stylist.id, { blockedDates: next });
  };

  if (!stylist) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-text-muted text-lg">
          {language === "es"
            ? "No se encontró el perfil del estilista."
            : "Stylist profile not found."}
        </p>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("stylistDash", "myProfile")}
        </h1>
        <p className="text-text-secondary mt-1">
          {language === "es"
            ? "Visualiza y edita tu información de perfil"
            : "View and edit your profile information"}
        </p>
      </motion.div>

      {/* Profile Info Card */}
      <motion.div variants={fadeInUp}>
        <Card>
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <Image
                src={editForm.avatar || stylist.avatar || "/icon.png"}
                alt={stylist.name}
                width={120}
                height={120}
                className="rounded-full object-cover"
              />
              {isEditing && (
                <input
                  type="url"
                  value={editForm.avatar}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, avatar: e.target.value }))}
                  placeholder={language === "es" ? "URL de tu foto" : "Photo URL"}
                  className="w-full text-xs px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-mila-gold/30"
                  style={{ background: "var(--color-bg-input)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-default)" }}
                />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Name */}
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full text-2xl font-bold text-text-primary bg-transparent border-b-2 border-mila-gold/40 focus:border-mila-gold focus:outline-none pb-1 transition-colors"
                    placeholder={language === "es" ? "Tu nombre" : "Your name"}
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-text-primary">{stylist.name}</h2>
                )}
                <p className="text-sm text-text-secondary mt-1">{stylist.role[language]}</p>
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  Bio
                </label>
                {isEditing ? (
                  <div className="space-y-3 mt-1">
                    <div>
                      <span className="text-xs text-text-muted">EN</span>
                      <textarea
                        value={editForm.bioEn}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, bioEn: e.target.value }))}
                        rows={3}
                        className="w-full mt-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mila-gold/30 resize-none"
                        style={{ background: "var(--color-bg-input)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-default)" }}
                        placeholder="Bio in English..."
                      />
                    </div>
                    <div>
                      <span className="text-xs text-text-muted">ES</span>
                      <textarea
                        value={editForm.bioEs}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, bioEs: e.target.value }))}
                        rows={3}
                        className="w-full mt-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mila-gold/30 resize-none"
                        style={{ background: "var(--color-bg-input)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-default)" }}
                        placeholder="Bio en Español..."
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                    {stylist.bio?.[language] || (language === "es" ? "Sin biografía" : "No bio")}
                  </p>
                )}
              </div>

              {/* Instagram */}
              <div className="flex items-center gap-2">
                <Instagram size={16} className="text-text-muted" />
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.instagram}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, instagram: e.target.value }))}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mila-gold/30"
                    style={{ background: "var(--color-bg-input)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-default)" }}
                    placeholder="@instagram_handle"
                  />
                ) : (
                  <span className="text-sm text-text-secondary">
                    {stylist.instagram || (language === "es" ? "No configurado" : "Not set")}
                  </span>
                )}
              </div>

              {/* Specialties */}
              <div>
                <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  {language === "es" ? "Especialidades" : "Specialties"}
                </label>
                <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                  {(isEditing ? editForm.specialties : stylist.specialties).map((spec) => (
                    <span key={spec} className="inline-flex items-center gap-1.5">
                      <Badge variant="default">{spec}</Badge>
                      {isEditing && (
                        <button
                          onClick={() => removeSpecialty(spec)}
                          className="p-0.5 text-text-muted hover:text-red-400"
                          title={language === "es" ? "Quitar" : "Remove"}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </span>
                  ))}
                  {isEditing && (
                    <span className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={newSpecialty}
                        onChange={(e) => setNewSpecialty(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSpecialty(); } }}
                        placeholder={language === "es" ? "Nueva especialidad" : "New specialty"}
                        className="text-xs px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-mila-gold/30"
                        style={{ background: "var(--color-bg-input)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-default)" }}
                      />
                      <button
                        onClick={addSpecialty}
                        className="p-1 rounded-md text-mila-gold hover:bg-mila-gold/10"
                        title={language === "es" ? "Agregar" : "Add"}
                      >
                        <Plus size={14} />
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star size={18} className="text-amber-400 fill-amber-400" />
                  <span className="text-lg font-semibold text-text-primary">{stylist.rating}</span>
                </div>
                <span className="text-sm text-text-muted">
                  ({stylist.reviewCount} {language === "es" ? "reseñas" : "reviews"})
                </span>
              </div>

              {/* Edit / Save / Cancel buttons */}
              <div className="flex gap-3 pt-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="px-5 py-2 text-sm font-medium rounded-lg bg-mila-gold text-white hover:bg-mila-gold-dark transition-colors"
                    >
                      {language === "es" ? "Guardar" : "Save"}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-5 py-2 text-sm font-medium rounded-lg border border-border-default text-text-secondary hover:bg-mila-gold/10 transition-colors"
                    >
                      {language === "es" ? "Cancelar" : "Cancel"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStartEdit}
                    className="px-5 py-2 text-sm font-medium rounded-lg border border-border-default text-text-secondary hover:bg-mila-gold/10 transition-colors flex items-center gap-2"
                  >
                    <User size={14} />
                    {t("stylistDash", "editProfile")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Commission Rates Card */}
      <motion.div variants={fadeInUp}>
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-mila-gold/10">
              <Percent size={20} className="text-mila-gold" />
            </div>
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary">
              {t("stylistDash", "myCommissions")}
            </h2>
          </div>

          {/* Default commission */}
          <div className="flex items-center justify-between py-3 px-4 rounded-lg mb-4" style={{ background: "var(--color-accent-subtle)" }}>
            <span className="text-sm font-medium text-text-primary">
              {language === "es" ? "Comisión por defecto" : "Default Commission"}
            </span>
            <span className="text-lg font-bold text-mila-gold">
              {stylist.defaultCommission}%
            </span>
          </div>

          {/* Service-specific commissions */}
          {stylist.serviceCommissions && stylist.serviceCommissions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="text-left py-2.5 px-4 text-text-muted font-medium text-xs uppercase tracking-wider">
                      {language === "es" ? "Servicio" : "Service"}
                    </th>
                    <th className="text-right py-2.5 px-4 text-text-muted font-medium text-xs uppercase tracking-wider">
                      {language === "es" ? "Tarifa personalizada" : "Custom Rate"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stylist.serviceCommissions.map((sc) => {
                    const service = services.find((s) => s.id === sc.serviceId);
                    return (
                      <tr key={sc.serviceId} className="border-b border-border-default/50 last:border-0">
                        <td className="py-2.5 px-4 text-text-primary">
                          {service?.name[language] ?? sc.serviceId}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-mila-gold">
                          {sc.percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Admin note */}
          <p className="text-xs text-text-muted mt-4 italic">
            {language === "es"
              ? "Las tarifas de comisión son configuradas por el administrador"
              : "Commission rates are configured by admin"}
          </p>
        </Card>
      </motion.div>

      {/* Weekly Schedule Card — editable when in edit mode */}
      <motion.div variants={fadeInUp}>
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-success/10">
              <Clock size={20} className="text-success" />
            </div>
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary">
              {t("stylistDash", "myWeeklySchedule")}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left py-2.5 px-4 text-text-muted font-medium text-xs uppercase tracking-wider">
                    {language === "es" ? "Día" : "Day"}
                  </th>
                  <th className="text-left py-2.5 px-4 text-text-muted font-medium text-xs uppercase tracking-wider">
                    {language === "es" ? "Inicio" : "Start"}
                  </th>
                  <th className="text-left py-2.5 px-4 text-text-muted font-medium text-xs uppercase tracking-wider">
                    {language === "es" ? "Fin" : "End"}
                  </th>
                  <th className="text-right py-2.5 px-4 text-text-muted font-medium text-xs uppercase tracking-wider">
                    {language === "es" ? "Estado" : "Status"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
                  const daySched = (isEditing ? scheduleEdit : fillSchedule(stylist.schedule)).find(
                    (s) => s.dayOfWeek === dayOfWeek
                  )!;
                  return (
                    <tr key={dayOfWeek} className="border-b border-border-default/50 last:border-0">
                      <td className="py-3 px-4 font-medium text-text-primary">
                        {dayNames[dayOfWeek]}
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        {isEditing ? (
                          <input
                            type="time"
                            value={daySched.startTime}
                            onChange={(e) => updateScheduleField(dayOfWeek, "startTime", e.target.value)}
                            className="px-2 py-1 rounded-md text-sm"
                            style={{ background: "var(--color-bg-input)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-default)" }}
                          />
                        ) : daySched.isAvailable ? (
                          daySched.startTime
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        {isEditing ? (
                          <input
                            type="time"
                            value={daySched.endTime}
                            onChange={(e) => updateScheduleField(dayOfWeek, "endTime", e.target.value)}
                            className="px-2 py-1 rounded-md text-sm"
                            style={{ background: "var(--color-bg-input)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-default)" }}
                          />
                        ) : daySched.isAvailable ? (
                          daySched.endTime
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <button
                            onClick={() => updateScheduleField(dayOfWeek, "isAvailable", !daySched.isAvailable)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${daySched.isAvailable ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/10 text-red-400"}`}
                          >
                            {daySched.isAvailable ? t("stylistDash", "available") : t("stylistDash", "unavailable")}
                          </button>
                        ) : (
                          <Badge variant={daySched.isAvailable ? "success" : "error"}>
                            {daySched.isAvailable ? t("stylistDash", "available") : t("stylistDash", "unavailable")}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isEditing && (
            <p className="text-xs text-text-muted mt-3">
              {language === "es"
                ? "Guarda los cambios para aplicar el horario."
                : "Save changes to apply the schedule."}
            </p>
          )}
        </Card>
      </motion.div>

      {/* Blocked dates (vacations / time off) */}
      <motion.div variants={fadeInUp}>
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-red-500/10">
              <CalendarOff size={20} className="text-red-400" />
            </div>
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary">
              {language === "es" ? "Fechas bloqueadas" : "Blocked dates"}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {blockedDates.length === 0 ? (
              <p className="text-sm text-text-muted">
                {language === "es"
                  ? "No tienes fechas bloqueadas. Agrega vacaciones o días libres aquí."
                  : "No blocked dates. Add vacations or days off here."}
              </p>
            ) : (
              blockedDates.map((date) => (
                <span
                  key={date}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  {date}
                  <button
                    onClick={() => removeBlockedDate(date)}
                    className="text-red-400 hover:text-red-500"
                    title={language === "es" ? "Quitar" : "Remove"}
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newBlockedDate}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="px-3 py-1.5 rounded-md text-sm"
              style={{ background: "var(--color-bg-input)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-default)" }}
            />
            <button
              onClick={addBlockedDate}
              disabled={!newBlockedDate}
              className="px-4 py-1.5 text-sm font-medium rounded-md bg-mila-gold text-white disabled:opacity-50 hover:bg-mila-gold-dark transition-colors"
            >
              {language === "es" ? "Bloquear" : "Block"}
            </button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
