"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useClientNotes } from "@/providers/ClientNoteProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import Button from "@/components/ui/Button";
import { StickyNote, Trash2, Send, User as UserIcon, ShoppingCart } from "lucide-react";

interface ClientNotesHistoryProps {
  clientId: string;
}

function formatNoteDate(iso: string, language: string): string {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString(
    language === "es" ? "es-ES" : "en-US",
    { day: "numeric", month: "short", year: "numeric" }
  );
  const timeStr = d.toLocaleTimeString(
    language === "es" ? "es-ES" : "en-US",
    { hour: "2-digit", minute: "2-digit" }
  );
  return `${dateStr} · ${timeStr}`;
}

/**
 * Admin-only history of internal notes about a client. Newest first.
 * Includes an inline add form at the top — saves to the same collection
 * the POS success view writes to. Notes can be deleted.
 */
export default function ClientNotesHistory({ clientId }: ClientNotesHistoryProps) {
  const { language } = useLanguage();
  const { addToast } = useToast();
  const { notesForClient, addNote, deleteNote } = useClientNotes();
  const { user } = useAuth();

  const [draftText, setDraftText] = useState("");

  const notes = useMemo(() => notesForClient(clientId), [clientId, notesForClient]);

  const handleAdd = useCallback(() => {
    const text = draftText.trim();
    if (!text) return;
    addNote({
      clientId,
      text,
      source: "admin-manual",
      ...(user?.id ? { createdBy: user.id } : {}),
      ...(user?.name ? { createdByName: user.name } : {}),
    });
    setDraftText("");
    addToast(
      language === "es" ? "Nota agregada" : "Note added",
      "success"
    );
  }, [draftText, clientId, addNote, user, addToast, language]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteNote(id);
      addToast(
        language === "es" ? "Nota eliminada" : "Note removed",
        "info"
      );
    },
    [deleteNote, addToast, language]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <StickyNote size={16} className="text-mila-gold" />
        <h4 className="text-sm font-semibold text-text-primary">
          {language === "es" ? "Notas internas" : "Internal notes"}
        </h4>
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          {language === "es" ? "Solo admin" : "Admin only"}
        </span>
      </div>

      {/* Inline add form */}
      <div
        className="rounded-xl p-3 space-y-2"
        style={{
          background: "var(--color-bg-glass)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={2}
          placeholder={
            language === "es"
              ? "Agregar una nota sobre este cliente..."
              : "Add a note about this client..."
          }
          className="w-full px-3 py-2 rounded-lg resize-none text-sm"
          style={{
            background: "var(--color-bg-input)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border-default)",
            outline: "none",
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            {language === "es" ? "⌘+Enter para guardar" : "⌘+Enter to save"}
          </span>
          <Button size="sm" onClick={handleAdd} disabled={!draftText.trim()}>
            <Send size={12} />
            {language === "es" ? "Agregar nota" : "Add note"}
          </Button>
        </div>
      </div>

      {/* History — newest first */}
      {notes.length === 0 ? (
        <p
          className="text-xs text-center py-4"
          style={{ color: "var(--color-text-muted)" }}
        >
          {language === "es"
            ? "Aún no hay notas para este cliente."
            : "No notes for this client yet."}
        </p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {notes.map((note, idx) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl p-3"
                style={{
                  background:
                    idx === 0
                      ? "var(--color-accent-subtle)"
                      : "var(--color-bg-glass)",
                  border:
                    idx === 0
                      ? "1px solid var(--color-border-accent)"
                      : "1px solid var(--color-border-default)",
                }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background:
                        note.source === "pos-sale"
                          ? "var(--color-accent-subtle)"
                          : "var(--color-bg-input)",
                    }}
                  >
                    {note.source === "pos-sale" ? (
                      <ShoppingCart
                        size={11}
                        style={{ color: "var(--color-accent)" }}
                      />
                    ) : (
                      <UserIcon
                        size={11}
                        style={{ color: "var(--color-text-muted)" }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm whitespace-pre-wrap break-words"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {note.text}
                    </p>
                    <div
                      className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <span>{formatNoteDate(note.createdAt, language)}</span>
                      {note.createdByName && (
                        <>
                          <span>·</span>
                          <span>{note.createdByName}</span>
                        </>
                      )}
                      {note.source === "pos-sale" && (
                        <>
                          <span>·</span>
                          <span style={{ color: "var(--color-accent)" }}>
                            {language === "es"
                              ? "Desde el cobro"
                              : "From sale"}
                          </span>
                        </>
                      )}
                      {idx === 0 && (
                        <span
                          className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider"
                          style={{
                            background: "var(--color-accent)",
                            color: "var(--color-text-inverse)",
                          }}
                        >
                          {language === "es" ? "Última" : "Latest"}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="flex-shrink-0 p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                    title={language === "es" ? "Eliminar" : "Delete"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
