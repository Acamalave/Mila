"use client";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/providers/LanguageProvider";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
}: DeleteConfirmModalProps) {
  const { t } = useLanguage();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center space-y-5">
        {/* Warning Icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            transition: "all 0.3s ease",
          }}
        >
          <AlertTriangle
            size={28}
            style={{ color: "#ef4444" }}
          />
        </div>

        {/* Title */}
        <h3
          className="text-lg font-semibold"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-text-primary)",
            transition: "color 0.3s ease",
          }}
        >
          {title}
        </h3>

        {/* Message with itemName highlighted */}
        <p
          className="text-sm leading-relaxed"
          style={{
            color: "var(--color-text-secondary)",
            transition: "color 0.3s ease",
          }}
        >
          {message.split(itemName).map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <strong
                  style={{
                    color: "var(--color-text-primary)",
                    fontWeight: 600,
                  }}
                >
                  {itemName}
                </strong>
              )}
            </span>
          ))}
          {/* Fallback: if itemName is not found in message, show it separately */}
          {!message.includes(itemName) && (
            <>
              {" "}
              <strong
                style={{
                  color: "var(--color-text-primary)",
                  fontWeight: 600,
                }}
              >
                {itemName}
              </strong>
              ?
            </>
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            fullWidth
          >
            {t("common", "cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            fullWidth
          >
            {t("common", "delete")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
