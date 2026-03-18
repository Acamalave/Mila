"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Check, X, Clock, Plus } from "lucide-react";
import { useStaff } from "@/providers/StaffProvider";
import { services } from "@/data/services";
import { useLanguage } from "@/providers/LanguageProvider";
import { useBooking } from "@/providers/BookingProvider";
import { formatPrice, formatServicePrice, getStoredData } from "@/lib/utils";

interface ServiceSelectorProps {
  stylistId: string;
  onContinue?: () => void;
}

export default function ServiceSelector({ stylistId, onContinue }: ServiceSelectorProps) {
  const { language, t } = useLanguage();
  const { state, dispatch } = useBooking();
  const { allStylists } = useStaff();
  const [detailService, setDetailService] = useState<string | null>(null);

  const stylist = useMemo(() => allStylists.find(s => s.id === stylistId), [stylistId, allStylists]);

  const durationOverrides = useMemo(() =>
    getStoredData<Record<string, number>>("mila-service-duration-overrides", {}), []);

  const availableServices = useMemo(() => {
    if (!stylist) return [];
    return services
      .filter(s => stylist.serviceIds.includes(s.id))
      .map(s => ({
        ...s,
        durationMinutes: durationOverrides[s.id] ?? s.durationMinutes,
      }));
  }, [stylist, durationOverrides]);

  const selectedIds = state.selectedServiceIds;
  const isGeneral = state.isGeneralAppointment;

  const totalPrice = useMemo(() => {
    return availableServices
      .filter(s => selectedIds.includes(s.id))
      .reduce((sum, s) => sum + s.price, 0);
  }, [availableServices, selectedIds]);

  const totalDuration = useMemo(() => {
    return availableServices
      .filter(s => selectedIds.includes(s.id))
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [availableServices, selectedIds]);

  const toggleService = (id: string) => {
    dispatch({ type: "TOGGLE_SERVICE", payload: id });
  };

  const toggleGeneral = () => {
    dispatch({ type: "SET_GENERAL_APPOINTMENT", payload: !isGeneral });
  };

  const canContinue = (selectedIds.length > 0 || isGeneral) && state.step < 3;

  const activeDetailService = useMemo(() => {
    if (!detailService) return null;
    return availableServices.find(s => s.id === detailService) ?? null;
  }, [detailService, availableServices]);

  return (
    <section className="py-10 sm:py-16 px-4 relative">
      <div className="max-w-2xl mx-auto">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: "0.3em",
              textTransform: "uppercase" as const,
              color: "var(--color-accent)",
              marginBottom: 8,
            }}
          >
            {stylist?.name}
          </p>
          <h2
            style={{
              fontFamily: "var(--font-accent)",
              fontSize: "clamp(1.8rem, 5vw, 2.4rem)",
              fontWeight: 300,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.01em",
              textTransform: "none",
            }}
          >
            {t("home", "selectServices")}
          </h2>
          <div
            style={{
              width: 40,
              height: 1,
              background: "var(--color-accent)",
              margin: "12px auto 0",
            }}
          />
        </motion.div>

        {/* General Consultation Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-5"
        >
          <motion.div
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
            onClick={toggleGeneral}
            className="flex items-center justify-between px-5 py-4 cursor-pointer"
            style={{
              background: isGeneral
                ? "rgba(196, 169, 106, 0.12)"
                : "var(--color-bg-glass)",
              backdropFilter: "blur(16px)",
              border: isGeneral
                ? "1px solid var(--color-border-accent)"
                : "1px solid var(--color-border-default)",
              borderRadius: 12,
              transition: "all 0.3s ease",
            }}
          >
            <div className="flex items-center gap-3">
              <Calendar size={16} style={{ color: "var(--color-accent)", opacity: 0.7 }} />
              <div>
                <p style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                  letterSpacing: "0.03em",
                }}>
                  {t("home", "generalAppointment")}
                </p>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                  {t("home", "generalAppointmentDesc")}
                </p>
              </div>
            </div>
            <AnimatePresence>
              {isGeneral && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--color-accent)",
                  }}
                >
                  <Check size={12} color="var(--color-text-inverse)" strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{ background: "var(--color-border-default)" }} />
          <span style={{
            fontSize: 10,
            color: "var(--color-text-muted)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.15em",
            fontFamily: "var(--font-display)",
          }}>
            {language === "es" ? "o elige servicios" : "or choose services"}
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--color-border-default)" }} />
        </div>

        {/* Services Grid - compact cards, name + price only */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.03, delayChildren: 0.1 },
            },
          }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pb-28"
        >
          {availableServices.map((service) => {
            const isSelected = selectedIds.includes(service.id);

            return (
              <motion.div
                key={service.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleService(service.id)}
                className="relative cursor-pointer group"
                style={{
                  background: isSelected
                    ? "rgba(196, 169, 106, 0.15)"
                    : "rgba(255, 255, 255, 0.04)",
                  border: isSelected
                    ? "1px solid rgba(196, 169, 106, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: 10,
                  padding: "14px 12px",
                  transition: "all 0.3s ease",
                  minHeight: 72,
                  display: "flex",
                  flexDirection: "column" as const,
                  justifyContent: "space-between",
                }}
              >
                {/* Checkmark indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="absolute flex items-center justify-center"
                      style={{
                        top: -5,
                        right: -5,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "var(--color-accent)",
                      }}
                    >
                      <Check size={10} color="#0a0a0a" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Service Name */}
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    fontWeight: 400,
                    color: isSelected ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    lineHeight: 1.35,
                    letterSpacing: "0.02em",
                    transition: "color 0.3s ease",
                    marginBottom: 8,
                  }}
                >
                  {service.name[language]}
                </p>

                {/* Price + Info button */}
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isSelected ? "var(--color-accent)" : "rgba(196, 169, 106, 0.7)",
                      fontFamily: "var(--font-display)",
                      transition: "color 0.3s ease",
                    }}
                  >
                    {formatServicePrice(service.price, service.priceMax)}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailService(service.id);
                    }}
                    className="flex items-center justify-center"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--color-text-muted)",
                      fontSize: 11,
                      cursor: "pointer",
                      border: "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Plus size={10} />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Service Detail Modal */}
        <AnimatePresence>
          {activeDetailService && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
              style={{ zIndex: 60, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              onClick={() => setDetailService(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md relative"
                style={{
                  background: "#1a1a1a",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                {/* Top accent line */}
                <div style={{ height: 2, background: "var(--gradient-accent)" }} />

                <div className="p-6">
                  {/* Close button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setDetailService(null)}
                    className="absolute flex items-center justify-center"
                    style={{
                      top: 14,
                      right: 14,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    <X size={14} />
                  </motion.button>

                  {/* Service name */}
                  <h3
                    style={{
                      fontFamily: "var(--font-accent)",
                      fontSize: 22,
                      fontWeight: 400,
                      color: "var(--color-text-primary)",
                      marginBottom: 4,
                      paddingRight: 32,
                    }}
                  >
                    {activeDetailService.name[language]}
                  </h3>

                  {/* Category label */}
                  <p style={{
                    fontSize: 11,
                    color: "var(--color-accent)",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    marginBottom: 16,
                  }}>
                    {activeDetailService.categoryId.replace("cat-", "")}
                  </p>

                  {/* Description */}
                  <p style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "var(--color-text-secondary)",
                    marginBottom: 20,
                  }}>
                    {activeDetailService.description[language]}
                  </p>

                  {/* Note if exists */}
                  {activeDetailService.note && (
                    <p style={{
                      fontSize: 11,
                      fontStyle: "italic",
                      color: "var(--color-text-muted)",
                      marginBottom: 20,
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8,
                      borderLeft: "2px solid var(--color-accent)",
                    }}>
                      {activeDetailService.note[language]}
                    </p>
                  )}

                  {/* Duration + Price row */}
                  <div className="flex items-center justify-between mb-5"
                    style={{
                      padding: "12px 16px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 10,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={14} style={{ color: "var(--color-text-muted)" }} />
                      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                        ~{activeDetailService.durationMinutes} min
                      </span>
                    </div>
                    <span style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: "var(--color-accent)",
                      fontFamily: "var(--font-display)",
                    }}>
                      {formatServicePrice(activeDetailService.price, activeDetailService.priceMax)}
                    </span>
                  </div>

                  {/* Add/Remove button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      toggleService(activeDetailService.id);
                      setDetailService(null);
                    }}
                    className="w-full py-3.5 rounded-full text-center"
                    style={{
                      background: selectedIds.includes(activeDetailService.id)
                        ? "rgba(155, 77, 77, 0.15)"
                        : "var(--color-accent)",
                      color: selectedIds.includes(activeDetailService.id)
                        ? "#c77"
                        : "var(--color-text-inverse)",
                      fontFamily: "var(--font-display)",
                      fontSize: 13,
                      fontWeight: 500,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase" as const,
                      border: selectedIds.includes(activeDetailService.id)
                        ? "1px solid rgba(155, 77, 77, 0.3)"
                        : "none",
                      cursor: "pointer",
                    }}
                  >
                    {selectedIds.includes(activeDetailService.id)
                      ? (language === "es" ? "Quitar servicio" : "Remove service")
                      : (language === "es" ? "Agregar servicio" : "Add service")}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Bottom Bar - shows price + estimated time */}
        <AnimatePresence>
          {canContinue && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 sm:pb-6"
            >
              <div
                className="max-w-2xl mx-auto flex items-center justify-between px-5 py-4"
                style={{
                  background: "linear-gradient(135deg, rgba(142, 123, 84, 0.25), rgba(196, 169, 106, 0.15))",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  borderRadius: 16,
                  border: "1px solid rgba(196, 169, 106, 0.35)",
                  boxShadow: "0 -4px 30px rgba(0,0,0,0.5), 0 0 20px rgba(196, 169, 106, 0.08)",
                }}
              >
                <div>
                  {!isGeneral ? (
                    <>
                      <div className="flex items-center gap-3">
                        <p style={{
                          color: "var(--color-text-primary)",
                          fontSize: 20,
                          fontWeight: 700,
                          fontFamily: "var(--font-display)",
                        }}>
                          {formatPrice(totalPrice)}
                        </p>
                        <div
                          style={{
                            width: 1,
                            height: 16,
                            background: "rgba(196, 169, 106, 0.4)",
                          }}
                        />
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} style={{ color: "var(--color-accent)" }} />
                          <span style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--color-text-secondary)",
                          }}>
                            {totalDuration >= 60
                              ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60 > 0 ? `${totalDuration % 60}min` : ""}`
                              : `${totalDuration} min`}
                          </span>
                        </div>
                      </div>
                      <p style={{
                        color: "var(--color-accent)",
                        fontSize: 11,
                        marginTop: 3,
                        fontFamily: "var(--font-display)",
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                      }}>
                        {selectedIds.length} {t("home", "totalSelected")}
                      </p>
                    </>
                  ) : (
                    <p style={{
                      color: "var(--color-text-primary)",
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.05em",
                    }}>
                      {t("home", "generalAppointment")}
                    </p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onContinue}
                  className="px-6 py-3 rounded-full"
                  style={{
                    background: "var(--color-accent)",
                    color: "var(--color-text-inverse)",
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase" as const,
                    cursor: "pointer",
                    border: "none",
                    boxShadow: "0 2px 12px rgba(196, 169, 106, 0.3)",
                  }}
                >
                  {t("home", "continueToDate")}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
