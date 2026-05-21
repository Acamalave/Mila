"use client";

import { motion, AnimatePresence } from "motion/react";
import { Clock, RotateCcw, Trash2, FileText } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import Card from "@/components/ui/Card";
import { formatPrice, calculateTaxBreakdown } from "@/lib/utils";
import type { POSDraft } from "@/lib/pos-drafts";

interface POSDraftsListProps {
  drafts: POSDraft[];
  onResume: (draft: POSDraft) => void;
  onDelete: (draftId: string) => void;
}

function formatRelative(iso: string, language: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return language === "es" ? "hace un momento" : "just now";
  if (minutes < 60) {
    return language === "es" ? `hace ${minutes} min` : `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return language === "es" ? `hace ${hours} h` : `${hours} h ago`;
  }
  const days = Math.floor(hours / 24);
  return language === "es" ? `hace ${days} d` : `${days}d ago`;
}

export default function POSDraftsList({
  drafts,
  onResume,
  onDelete,
}: POSDraftsListProps) {
  const { language } = useLanguage();
  const { allStylists } = useStaff();

  if (drafts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 px-1"
        style={{ color: "var(--color-text-muted)" }}
      >
        <FileText size={14} />
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ letterSpacing: "0.08em" }}
        >
          {language === "es"
            ? `Borradores guardados (${drafts.length})`
            : `Saved drafts (${drafts.length})`}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {drafts.map((draft) => {
          const subtotal = draft.items.reduce(
            (sum, it) => sum + it.price * it.quantity,
            0
          );
          const { total } = calculateTaxBreakdown(subtotal, draft.discount);
          const itemCount = draft.items.reduce(
            (sum, it) => sum + it.quantity,
            0
          );
          const stylist = draft.stylistId
            ? allStylists.find((s) => s.id === draft.stylistId)
            : null;

          return (
            <motion.div
              key={draft.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card
                padding="none"
                className="overflow-hidden"
              >
                <div className="flex items-stretch">
                  {/* Body: summary */}
                  <button
                    onClick={() => onResume(draft)}
                    className="flex-1 min-w-0 text-left p-4 hover:bg-white/[0.03] transition-colors cursor-pointer"
                    title={
                      language === "es" ? "Reanudar borrador" : "Resume draft"
                    }
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {draft.client?.name ||
                          (language === "es"
                            ? "Sin cliente"
                            : "No client")}
                      </p>
                      <p
                        className="text-base font-bold whitespace-nowrap"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {formatPrice(total)}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-2 flex-wrap text-[11px]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <span>
                        {itemCount}{" "}
                        {language === "es"
                          ? itemCount === 1
                            ? "item"
                            : "items"
                          : itemCount === 1
                            ? "item"
                            : "items"}
                      </span>
                      {stylist && (
                        <>
                          <span>·</span>
                          <span>{stylist.name}</span>
                        </>
                      )}
                      {draft.discount > 0 && (
                        <>
                          <span>·</span>
                          <span
                            style={{ color: "var(--color-accent)" }}
                          >
                            -{draft.discount}%
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={10} />
                        {formatRelative(draft.createdAt, language)}
                      </span>
                    </div>
                  </button>

                  {/* Actions: resume + delete */}
                  <div className="flex items-stretch">
                    <button
                      onClick={() => onResume(draft)}
                      className="px-3 flex items-center justify-center text-text-secondary hover:text-mila-gold hover:bg-mila-gold/10 transition-colors cursor-pointer border-l border-border-default"
                      title={
                        language === "es" ? "Reanudar" : "Resume"
                      }
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(draft.id)}
                      className="px-3 flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border-l border-border-default"
                      title={
                        language === "es" ? "Eliminar" : "Delete"
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
