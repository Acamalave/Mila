"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { cn, getStoredData, setStoredData } from "@/lib/utils";
import { stylists } from "@/data/stylists";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import StarRating from "@/components/ui/StarRating";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { Clock, Edit2, Plus } from "lucide-react";
import type { Stylist, StylistSchedule } from "@/types/stylist";

const DAY_NAMES_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAY_NAMES_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
];

interface ScheduleOverride {
  [stylistId: string]: StylistSchedule[];
}

export default function AdminStaffPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride>(
    {}
  );
  const [editingStylist, setEditingStylist] = useState<Stylist | null>(null);
  const [editSchedule, setEditSchedule] = useState<StylistSchedule[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    roleEn: "",
    roleEs: "",
    email: "",
  });

  useEffect(() => {
    const stored = getStoredData<ScheduleOverride>(
      "mila-staff-schedules",
      {}
    );
    setScheduleOverrides(stored);
  }, []);

  const getEffectiveSchedule = (stylist: Stylist): StylistSchedule[] => {
    return scheduleOverrides[stylist.id] || stylist.schedule;
  };

  const openScheduleEditor = (stylist: Stylist) => {
    setEditingStylist(stylist);
    setEditSchedule(
      getEffectiveSchedule(stylist).map((s) => ({ ...s }))
    );
  };

  const saveSchedule = useCallback(() => {
    if (!editingStylist) return;
    const updated = {
      ...scheduleOverrides,
      [editingStylist.id]: editSchedule,
    };
    setScheduleOverrides(updated);
    setStoredData("mila-staff-schedules", updated);
    setEditingStylist(null);
    addToast(
      language === "es"
        ? "Horario actualizado"
        : "Schedule updated",
      "success"
    );
  }, [editingStylist, editSchedule, scheduleOverrides, addToast, language]);

  const updateDaySchedule = (
    dayOfWeek: number,
    field: keyof StylistSchedule,
    value: string | boolean
  ) => {
    setEditSchedule((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s
      )
    );
  };

  const dayNames = language === "es" ? DAY_NAMES_ES : DAY_NAMES_EN;

  const getScheduleSummary = (schedule: StylistSchedule[]): string => {
    const availableDays = schedule
      .filter((s) => s.isAvailable)
      .map((s) => dayNames[s.dayOfWeek].slice(0, 3));
    return availableDays.join(", ") || (language === "es" ? "Sin horario" : "No schedule");
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div
        variants={fadeInUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
            {t("admin", "staff")}
          </h1>
          <p className="text-text-secondary mt-1">
            {language === "es"
              ? "Gestiona el equipo y sus horarios"
              : "Manage team members and schedules"}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          {t("admin", "addStaff")}
        </Button>
      </motion.div>

      {/* Staff grid */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {stylists.map((stylist) => {
          const schedule = getEffectiveSchedule(stylist);
          return (
            <Card key={stylist.id} className="flex flex-col">
              <div className="flex items-start gap-4">
                <Avatar
                  src={stylist.avatar}
                  alt={stylist.name}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-text-primary">
                    {stylist.name}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {stylist.role[language]}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={stylist.rating} size={14} />
                    <span className="text-xs text-text-muted">
                      ({stylist.reviewCount})
                    </span>
                  </div>
                </div>
              </div>

              {/* Specialties */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {stylist.specialties.map((spec) => (
                  <Badge key={spec} variant="default">
                    {spec}
                  </Badge>
                ))}
              </div>

              {/* Schedule summary */}
              <div className="flex items-center gap-2 mt-4 text-sm text-text-secondary">
                <Clock size={14} className="text-text-muted flex-shrink-0" />
                <span>{getScheduleSummary(schedule)}</span>
              </div>

              {/* Edit button */}
              <div className="mt-4 pt-4 border-t border-border-default">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openScheduleEditor(stylist)}
                >
                  <Edit2 size={14} />
                  {t("admin", "editSchedule")}
                </Button>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Schedule editor modal */}
      <Modal
        isOpen={!!editingStylist}
        onClose={() => setEditingStylist(null)}
        title={
          editingStylist
            ? `${t("admin", "editSchedule")} - ${editingStylist.name}`
            : ""
        }
        size="lg"
      >
        {editingStylist && (
          <div className="space-y-4">
            {/* Schedule rows sorted Mon(1) to Sun(0) */}
            {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
              const daySched = editSchedule.find(
                (s) => s.dayOfWeek === dayOfWeek
              );
              if (!daySched) return null;

              return (
                <div
                  key={dayOfWeek}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg",
                    daySched.isAvailable
                      ? "bg-success/5"
                      : "bg-mila-cream/60"
                  )}
                >
                  <div className="w-28 font-medium text-sm text-text-primary">
                    {dayNames[dayOfWeek]}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={daySched.isAvailable}
                      onChange={(e) =>
                        updateDaySchedule(
                          dayOfWeek,
                          "isAvailable",
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 rounded accent-mila-gold"
                    />
                    <span className="text-sm text-text-secondary">
                      {language === "es" ? "Disponible" : "Available"}
                    </span>
                  </label>

                  {daySched.isAvailable && (
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <input
                        type="time"
                        value={daySched.startTime}
                        onChange={(e) =>
                          updateDaySchedule(
                            dayOfWeek,
                            "startTime",
                            e.target.value
                          )
                        }
                        className="px-3 py-1.5 rounded-lg border border-border-default text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mila-gold/30"
                      />
                      <span className="text-text-muted">-</span>
                      <input
                        type="time"
                        value={daySched.endTime}
                        onChange={(e) =>
                          updateDaySchedule(
                            dayOfWeek,
                            "endTime",
                            e.target.value
                          )
                        }
                        className="px-3 py-1.5 rounded-lg border border-border-default text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mila-gold/30"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingStylist(null)}
              >
                {t("common", "cancel")}
              </Button>
              <Button size="sm" onClick={saveSchedule}>
                {t("common", "save")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add staff modal (placeholder) */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t("admin", "addStaff")}
      >
        <div className="space-y-4">
          <Input
            label={language === "es" ? "Nombre Completo" : "Full Name"}
            value={addForm.name}
            onChange={(e) =>
              setAddForm({ ...addForm, name: e.target.value })
            }
            placeholder="e.g. Maria Lopez"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={
                language === "es"
                  ? "Rol (Ingles)"
                  : "Role (English)"
              }
              value={addForm.roleEn}
              onChange={(e) =>
                setAddForm({ ...addForm, roleEn: e.target.value })
              }
              placeholder="e.g. Hair Stylist"
            />
            <Input
              label={
                language === "es"
                  ? "Rol (Espanol)"
                  : "Role (Spanish)"
              }
              value={addForm.roleEs}
              onChange={(e) =>
                setAddForm({ ...addForm, roleEs: e.target.value })
              }
              placeholder="e.g. Estilista"
            />
          </div>
          <Input
            label={language === "es" ? "Correo" : "Email"}
            type="email"
            value={addForm.email}
            onChange={(e) =>
              setAddForm({ ...addForm, email: e.target.value })
            }
            placeholder="email@example.com"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddModal(false)}
            >
              {t("common", "cancel")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                addToast(
                  language === "es"
                    ? "Funcion disponible proximamente"
                    : "Feature coming soon",
                  "info"
                );
                setShowAddModal(false);
                setAddForm({
                  name: "",
                  roleEn: "",
                  roleEs: "",
                  email: "",
                });
              }}
            >
              {t("common", "save")}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
