"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, CreditCard, Check } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import type { CreditCard as CreditCardType, CardBrand } from "@/types";

interface SavedCardSelectorProps {
  cards: CreditCardType[];
  selectedCardId: string | null;
  onSelect: (cardId: string) => void;
  onAddNew: () => void;
  onRemoveCard?: (cardId: string) => void;
}

const BRAND_LABELS: Record<CardBrand, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
  unknown: "CARD",
};

const BRAND_COLORS: Record<CardBrand, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  amex: "#006FCF",
  discover: "#FF6600",
  unknown: "var(--color-text-muted)",
};

export default function SavedCardSelector({
  cards,
  selectedCardId,
  onSelect,
  onAddNew,
  onRemoveCard,
}: SavedCardSelectorProps) {
  const { t } = useLanguage();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const handleDelete = (cardId: string) => {
    if (confirmDeleteId === cardId) {
      onRemoveCard?.(cardId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(cardId);
      // Auto-dismiss after 3s
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  return (
    <div className="space-y-3">
      <p
        className="text-sm font-medium mb-3"
        style={{ color: "var(--color-text-secondary)", letterSpacing: "0.03em" }}
      >
        {t("payment", "selectCard")}
      </p>

      {/* Card list */}
      <div className="space-y-2">
        {cards.map((card, index) => {
          const isSelected = selectedCardId === card.id;
          const isHovered = hoveredCardId === card.id;
          const isConfirmingDelete = confirmDeleteId === card.id;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => onSelect(card.id)}
              onMouseEnter={() => setHoveredCardId(card.id)}
              onMouseLeave={() => {
                setHoveredCardId(null);
                if (isConfirmingDelete) setConfirmDeleteId(null);
              }}
              className="relative flex items-center gap-3 p-4 rounded-xl cursor-pointer"
              style={{
                background: isSelected
                  ? "var(--color-bg-glass)"
                  : "var(--color-bg-card)",
                border: isSelected
                  ? "2px solid var(--color-accent)"
                  : "1px solid var(--color-border-default)",
                boxShadow: isSelected
                  ? "var(--shadow-glow)"
                  : "none",
                transition: "all 0.25s ease",
                padding: isSelected ? "15px" : "16px", // compensate for 2px vs 1px border
              }}
            >
              {/* Radio indicator */}
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: isSelected
                    ? "2px solid var(--color-accent)"
                    : "2px solid var(--color-border-default)",
                  transition: "all 0.2s ease",
                }}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                    }}
                  />
                )}
              </div>

              {/* Card icon area */}
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-lg"
                style={{
                  width: 44,
                  height: 32,
                  background: "var(--color-bg-glass)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <span
                  className="text-[10px] font-bold tracking-wider"
                  style={{ color: BRAND_COLORS[card.cardBrand] }}
                >
                  {BRAND_LABELS[card.cardBrand]}
                </span>
              </div>

              {/* Card details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {t("payment", "endingIn")} {card.lastFourDigits}
                  </span>
                  {card.isDefault && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        background: "var(--color-accent-subtle)",
                        color: "var(--color-accent)",
                      }}
                    >
                      Default
                    </span>
                  )}
                </div>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {t("payment", "expires")} {card.expiryMonth}/{card.expiryYear}
                </p>
              </div>

              {/* Selected check */}
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Check size={18} style={{ color: "var(--color-accent)" }} />
                </motion.div>
              )}

              {/* Delete button (on hover) */}
              {onRemoveCard && (
                <AnimatePresence>
                  {(isHovered || isConfirmingDelete) && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(card.id);
                      }}
                      className="flex-shrink-0 flex items-center justify-center rounded-lg"
                      style={{
                        width: 32,
                        height: 32,
                        background: isConfirmingDelete
                          ? "rgba(239, 68, 68, 0.15)"
                          : "var(--color-bg-glass)",
                        border: isConfirmingDelete
                          ? "1px solid rgba(239, 68, 68, 0.3)"
                          : "1px solid var(--color-border-default)",
                        color: isConfirmingDelete ? "#ef4444" : "var(--color-text-muted)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Add new card button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onAddNew}
        className="w-full flex items-center gap-3 p-4 rounded-xl"
        style={{
          background: "transparent",
          border: "2px dashed var(--color-border-default)",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--color-accent)";
          e.currentTarget.style.color = "var(--color-accent)";
          e.currentTarget.style.background = "var(--color-accent-subtle)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border-default)";
          e.currentTarget.style.color = "var(--color-text-secondary)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: 44,
            height: 32,
            border: "1px solid currentColor",
            opacity: 0.5,
          }}
        >
          <Plus size={16} />
        </div>
        <span className="text-sm font-medium">
          {t("payment", "useNewCard")}
        </span>
      </motion.button>
    </div>
  );
}
