"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { useStaff } from "@/providers/StaffProvider";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import StarRating from "@/components/ui/StarRating";
import StaffFormModal from "@/components/admin/StaffFormModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { Clock, Edit2, Plus, Trash2, UserCog } from "lucide-react";
import type { Stylist, StylistSchedule } from "@/types/stylist";

const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_NAMES_ES = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

export default function AdminStaffPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const { allStylists, addStylist, updateStylist, deleteStylist, updateSchedule } = useStaff();

  // Schedule editor
  const [editingStylist, setEditingStylist] = useState<Stylist | null>(null);
  const [editSchedule, setEditSchedule] = useState<StylistSchedule[]>([]);

  // Staff form modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDetails, setEditingDetails] = useState<Stylist | null>(null);

  // Delete confirmation
  const [deletingStaff, setDeletingStaff] = useState<Stylist | null>(null);

  const dayNames = language === "es" ? DAY_NAMES_ES : DAY_NAMES_EN;

  const getScheduleSummary = (schedule: StylistSchedule[]): string => {
    const availableDays = schedule
      .filter((s) => s.isAvailable)
      .map((s) => dayNames[s.dayOfWeek].slice(0, 3));
    return availableDays.join(", ") || (language === "es" ? "Sin horario" : "No schedule");
  };

  const openScheduleEditor = (stylist: Stylist) => {
    setEditingStylist(stylist);
    setEditSchedule(stylist.schedule.map((s) => ({ ...s })));
  };

  const saveSchedule = useCallback(() => {
    if (!editingStylist) return;
    updateSchedule(editingStylist.id, editSchedule);
    setEditingStylist(null);
    addToast(language === "es" ? "Horario actualizado" : "Schedule updated", "success");
  }, [editingStylist, editSchedule, updateSchedule, addToast, language]);

  const updateDaySchedule = (dayOfWeek: number, field: keyof StylistSchedule, value: string | boolean) => {
    setEditSchedule((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s))
    );
  };

  const handleAddStylist = (data: Omit<Stylist, "id">) => {
    addStylist(data);
    addToast(language === "es" ? "Personal agregado" : "Staff member added", "success");
  };

  const handleEditStylist = (data: Omit<Stylist, "id">) => {
    if (!editingDetails) return;
    updateStylist(editingDetails.id, data);
    addToast(language === "es" ? "Detalles actualizados" : "Details updated", "success");
  };

  const handleDeleteStylist = () => {
    if (!deletingStaff) return;
    deleteStylist(deletingStaff.id);
    setDeletingStaff(null);
    addToast(language === "es" ? "Personal eliminado" : "Staff member removed", "success");
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
            {t("admin", "staff")}
          </h1>
          <p className="text-text-secondary mt-1">
            {language === "es" ? "Gestiona el equipo y sus horarios" : "Manage team members and schedules"}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          {t("admin", "addStaff")}
        </Button>
      </motion.div>

      {/* Staff grid */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        {allStylists.map((stylist) => (
          <Card key={stylist.id} className="flex flex-col">
            <div className="flex items-start gap-4">
              <Avatar src={stylist.avatar} alt={stylist.name} size="lg" />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-text-primary">{stylist.name}</h3>
                <p className="text-sm text-text-secondary">{stylist.role[language]}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={stylist.rating} size={14} />
                  <span className="text-xs text-text-muted">({stylist.reviewCount})</span>
                </div>
              </div>
            </div>

            {/* Specialties */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {stylist.specialties.map((spec) => (
                <Badge key={spec} variant="default">{spec}</Badge>
              ))}
            </div>

            {/* Schedule summary */}
            <div className="flex items-center gap-2 mt-4 text-sm text-text-secondary">
              <Clock size={14} className="text-text-muted flex-shrink-0" />
              <span>{getScheduleSummary(stylist.schedule)}</span>
            </div>

            {/* Action buttons */}
            <div className="mt-4 pt-4 border-t border-border-default flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => openScheduleEditor(stylist)}>
                <Edit2 size={14} />
                {t("admin", "editSchedule")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditingDetails(stylist)}>
                <UserCog size={14} />
                {t("admin", "editDetails")}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDeletingStaff(stylist)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Schedule editor modal */}
      <Modal
        isOpen={!!editingStylist}
        onClose={() => setEditingStylist(null)}
        title={editingStylist ? `${t("admin", "editSchedule")} - ${editingStylist.name}` : ""}
        size="lg"
      >
        {editingStylist && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
              const daySched = editSchedule.find((s) => s.dayOfWeek === dayOfWeek);
              if (!daySched) return null;
              return (
                <div
                  key={dayOfWeek}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg",
                    daySched.isAvailable ? "bg-success/5" : "bg-white/5"
                  )}
                >
                  <div className="w-28 font-medium text-sm text-text-primary">{dayNames[dayOfWeek]}</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={daySched.isAvailable}
                      onChange={(e) => updateDaySchedule(dayOfWeek, "isAvailable", e.target.checked)}
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
                        onChange={(e) => updateDaySchedule(dayOfWeek, "startTime", e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-mila-gold/30"
                        style={{ background: "var(--color-bg-input)", color: "var(--color-text-primary)" }}
                      />
                      <span className="text-text-muted">-</span>
                      <input
                        type="time"
                        value={daySched.endTime}
                        onChange={(e) => updateDaySchedule(dayOfWeek, "endTime", e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-mila-gold/30"
                        style={{ background: "var(--color-bg-input)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
              <Button variant="ghost" size="sm" onClick={() => setEditingStylist(null)}>
                {t("common", "cancel")}
              </Button>
              <Button size="sm" onClick={saveSchedule}>
                {t("common", "save")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add staff modal */}
      <StaffFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddStylist}
      />

      {/* Edit staff details modal */}
      <StaffFormModal
        isOpen={!!editingDetails}
        onClose={() => setEditingDetails(null)}
        stylist={editingDetails || undefined}
        onSave={handleEditStylist}
      />

      {/* Delete confirmation */}
      <DeleteConfirmModal
        isOpen={!!deletingStaff}
        onClose={() => setDeletingStaff(null)}
        onConfirm={handleDeleteStylist}
        title={t("admin", "deleteStaff")}
        message={t("admin", "confirmDeleteStaff")}
        itemName={deletingStaff?.name || ""}
      />
    </motion.div>
  );
}
