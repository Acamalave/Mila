"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { usePayment } from "@/providers/PaymentProvider";
import { useCommissions } from "@/providers/CommissionProvider";
import { useStaff } from "@/providers/StaffProvider";
import { useToast } from "@/providers/ToastProvider";
import { useClientNotes } from "@/providers/ClientNoteProvider";
import { useAuth } from "@/providers/AuthProvider";
import { calculateTaxBreakdown, generateId, getStoredData, setStoredData } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import POSClientSelector from "@/components/admin/pos/POSClientSelector";
import POSItemSelector from "@/components/admin/pos/POSItemSelector";
import POSOrderReview from "@/components/admin/pos/POSOrderReview";
import POSPaymentSelector from "@/components/admin/pos/POSPaymentSelector";
import POSPendingView from "@/components/admin/pos/POSPendingView";
import POSSuccessView from "@/components/admin/pos/POSSuccessView";
import POSDraftsList from "@/components/admin/pos/POSDraftsList";
import {
  listDrafts,
  saveDraft,
  removeDraft,
  isCartDraftWorthy,
  type POSDraft,
} from "@/lib/pos-drafts";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  ShoppingCart,
  User,
  ShoppingBag,
  Receipt,
  CreditCard,
  Check,
  ChevronRight,
  ChevronLeft,
  Save,
  RotateCcw,
} from "lucide-react";
import type { InvoiceItem, PaymentMethod } from "@/types";
import type { POSClient } from "@/components/admin/pos/POSClientSelector";
import type { CounterMethod } from "@/components/admin/pos/POSPaymentSelector";

type Step = "client" | "items" | "review" | "payment" | "pending" | "success";

const STEPS: Step[] = ["client", "items", "review", "payment"];

const STEP_ICONS: Record<Step, typeof User> = {
  client: User,
  items: ShoppingBag,
  review: Receipt,
  payment: CreditCard,
  pending: CreditCard,
  success: Check,
};

export default function POSPage() {
  const { language, t } = useLanguage();
  const { addInvoice, createAndPayInvoice, sendInvoice } = useInvoices();
  const { processCounterPayment } = usePayment();
  const { generatePOSCommissions } = useCommissions();
  const { allStylists } = useStaff();
  const { addToast } = useToast();
  const { addNote } = useClientNotes();
  const { user: currentStaff } = useAuth();

  const savedCart = getStoredData<{ client: POSClient | null; items: InvoiceItem[]; stylistId: string | null; discount: number } | null>("mila-pos-cart", null);
  const [step, setStep] = useState<Step>(savedCart?.items?.length ? "items" : "client");
  const [client, setClient] = useState<POSClient | null>(savedCart?.client ?? null);
  const [items, setItems] = useState<InvoiceItem[]>(savedCart?.items ?? []);
  const [discount, setDiscount] = useState<number>(savedCart?.discount ?? 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<PaymentMethod>("counter");
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);
  const [stylistId, setStylistId] = useState<string | null>(savedCart?.stylistId ?? null);
  /** Stashed drafts so the operator can step away from a sale and pick it
   *  up later. Local-only — see lib/pos-drafts.ts. */
  const [drafts, setDrafts] = useState<POSDraft[]>(() => listDrafts());
  /** Controls the "Comenzar de cero" confirm dialog. We always confirm
   *  before wiping non-trivial state to avoid losing work to a stray click. */
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Persist cart to localStorage
  useEffect(() => {
    if (step === "success" || step === "pending") {
      setStoredData("mila-pos-cart", null);
    } else {
      setStoredData("mila-pos-cart", { client, items, stylistId, discount });
    }
  }, [client, items, stylistId, discount, step]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { discountAmount, afterDiscount, taxAmount, taxRate, total } = calculateTaxBreakdown(subtotal, discount);
  const currentStepIndex = STEPS.indexOf(step);

  // Items (services + products) missing a stylist assignment. We don't fall
  // back to invoice-level here on the `items` step because the goal is to
  // FORCE the operator to assign per-item before continuing — that's the
  // safest data shape for commissions and matches the "haz que falle
  // temprano" UX the operator asked for.
  const unassignedItemIndexes = useMemo(() => {
    const set = new Set<number>();
    items.forEach((item, idx) => {
      if ((item.type === "service" || item.type === "product") && !item.stylistId) {
        set.add(idx);
      }
    });
    return set;
  }, [items]);
  const hasUnassignedItem = unassignedItemIndexes.size > 0;
  // Review step still allows the invoice-level stylist as a fallback.
  const hasUnassignedServiceForReview = items.some(
    (item) => item.type === "service" && !item.stylistId && !stylistId
  );

  // Fill missing per-item stylist with the invoice-level stylist so commission
  // generation correctly attributes earnings (CommissionProvider reads
  // `item.stylistId ?? invoice.stylistId`, but POS clients may want the global
  // stylist applied to all items by default).
  const itemsWithStylist = useMemo(() => {
    if (!stylistId) return items;
    const stylistName = allStylists.find((s) => s.id === stylistId)?.name;
    return items.map((item) =>
      item.type === "service" && !item.stylistId
        ? { ...item, stylistId, stylistName }
        : item
    );
  }, [items, stylistId, allStylists]);

  const canGoNext = useCallback(() => {
    switch (step) {
      case "client":
        return !!client;
      case "items":
        // Must have at least one item AND every item (service or product)
        // must have a stylist assigned. Blocking here surfaces the gap
        // immediately instead of letting it slip to review/payment.
        return items.length > 0 && !hasUnassignedItem;
      case "review":
        // Review step lets the invoice-level stylist cover any service
        // that still doesn't have its own assignment.
        return !hasUnassignedServiceForReview;
      default:
        return false;
    }
  }, [step, client, items, hasUnassignedItem, hasUnassignedServiceForReview]);

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1 && canGoNext()) {
      setStep(STEPS[idx + 1]);
    }
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      setStep(STEPS[idx - 1]);
    }
  };

  /**
   * One handler covers every non-card method (yappy / cubo / cash / counter).
   * The chosen method is persisted on the invoice so the accountant
   * dashboard can break revenue down by source, and the gateway-fee
   * helper knows not to subtract a card-processor cut.
   */
  const handleCounterStyleMethod = async (
    method: CounterMethod,
    note: string
  ) => {
    if (!client) return;
    setIsProcessing(true);

    await new Promise((r) => setTimeout(r, 500));

    const invoice = createAndPayInvoice(
      {
        clientId: client.id,
        clientName: client.name,
        amount: total,
        subtotal,
        discount,
        discountAmount,
        afterDiscount,
        taxAmount,
        taxRate,
        items: itemsWithStylist,
        paymentMethod: method,
        // Keep using the existing `counterNote` field on Invoice as the
        // universal "free-text detail" — Yappy/Cubo reference numbers
        // and cash change notes all flow through it.
        ...(note.trim() ? { counterNote: note.trim() } : {}),
        status: "paid",
        date: new Date().toISOString().split("T")[0],
        description:
          language === "es"
            ? "Venta en punto de venta"
            : "Point of sale transaction",
        ...(stylistId ? { stylistId } : {}),
      } as Omit<typeof invoice, "id" | "createdAt">,
      `txn-${method}-${generateId()}`
    );

    // Mirror legacy bookkeeping — counter payment provider tracks all
    // non-gateway settlements in the same way.
    processCounterPayment(invoice.id, total, note);

    // Safety-net: ensure commissions land even if the invoice:paid event
    // listener didn't catch the emission.
    generatePOSCommissions(invoice);

    setLastPaymentMethod(method);
    setIsProcessing(false);
    setStep("success");
    addToast(
      language === "es"
        ? "Pago registrado exitosamente"
        : "Payment registered successfully",
      "success"
    );
  };

  const handleSendRequest = () => {
    if (!client) return;

    addToast(
      language === "es"
        ? "Creando solicitud de pago..."
        : "Creating payment request...",
      "info"
    );

    // Create invoice as "draft" so sendInvoice can transition to "sent"
    // and dispatch email + WhatsApp notifications.
    const newInv = addInvoice({
      clientId: client.id,
      clientName: client.name,
      amount: total,
      subtotal,
      discount,
      discountAmount,
      afterDiscount,
      taxAmount,
      taxRate,
      items,
      paymentMethod: "card",
      status: "draft",
      date: new Date().toISOString().split("T")[0],
      description:
        language === "es"
          ? "Venta en punto de venta"
          : "Point of sale transaction",
      ...(stylistId ? { stylistId } : {}),
    } as Omit<typeof newInv, "id" | "createdAt">);

    setLastInvoiceId(newInv.id);

    // Actually dispatch the email + WhatsApp payment request
    try {
      const maybePromise = sendInvoice(newInv.id) as unknown;
      if (maybePromise && typeof (maybePromise as Promise<void>).catch === "function") {
        (maybePromise as Promise<void>).catch((err) => {
          console.warn("[Mila] sendInvoice failed:", err);
        });
      }
    } catch (err) {
      console.warn("[Mila] sendInvoice threw:", err);
    }

    setLastPaymentMethod("card");
    setStep("pending");
  };

  const handleNewSale = () => {
    setStep("client");
    setClient(null);
    setItems([]);
    setStylistId(null);
    setDiscount(0);
    setIsProcessing(false);
    setStoredData("mila-pos-cart", null);
  };

  /**
   * Snapshot the current cart as a draft and reset the flow. The active
   * `mila-pos-cart` is cleared so the operator gets a blank canvas; the
   * draft appears in the list below ready to be resumed later.
   */
  const handleSaveDraft = useCallback(() => {
    if (!isCartDraftWorthy(client, items, stylistId)) {
      addToast(
        language === "es"
          ? "Agrega items o un cliente y estilista antes de guardar"
          : "Add items or a client and stylist before saving",
        "info"
      );
      return;
    }
    saveDraft({ client, items, stylistId, discount });
    setDrafts(listDrafts());
    handleNewSale();
    addToast(
      language === "es" ? "Borrador guardado" : "Draft saved",
      "success"
    );
  }, [client, items, stylistId, discount, language, addToast]);

  /**
   * Replace the current cart with the draft's contents and resume editing
   * from the items step (it's the most common place an operator wants to
   * pick up — they already have a client + items selected, may want to
   * tweak before checkout). The draft is removed from the list.
   */
  const handleResumeDraft = useCallback(
    (draft: POSDraft) => {
      setClient(draft.client);
      setItems(draft.items);
      setStylistId(draft.stylistId);
      setDiscount(draft.discount);
      setStep(draft.client ? "items" : "client");
      removeDraft(draft.id);
      setDrafts(listDrafts());
      addToast(
        language === "es" ? "Borrador retomado" : "Draft resumed",
        "success"
      );
    },
    [language, addToast]
  );

  const handleDeleteDraft = useCallback(
    (draftId: string) => {
      removeDraft(draftId);
      setDrafts(listDrafts());
      addToast(
        language === "es" ? "Borrador eliminado" : "Draft removed",
        "info"
      );
    },
    [language, addToast]
  );

  /**
   * "Comenzar de cero" button handler. Confirms before wiping when
   * there's meaningful state in the cart so a stray click doesn't lose
   * work. When the cart is already empty, just resets silently.
   */
  const handleRequestReset = useCallback(() => {
    if (!isCartDraftWorthy(client, items, stylistId)) {
      handleNewSale();
      return;
    }
    setShowResetConfirm(true);
  }, [client, items, stylistId]);

  const confirmReset = useCallback(() => {
    setShowResetConfirm(false);
    handleNewSale();
    addToast(
      language === "es" ? "Punto de venta limpiado" : "POS cleared",
      "info"
    );
  }, [language, addToast]);

  const stepLabel = (s: Step) => {
    switch (s) {
      case "client":
        return t("pos", "selectClient");
      case "items":
        return t("pos", "addItems");
      case "review":
        return t("pos", "review");
      case "payment":
        return t("pos", "payment");
      default:
        return "";
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-2xl mx-auto"
    >
      {/* Header */}
      <motion.div
        variants={fadeInUp}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <ShoppingCart size={24} style={{ color: "var(--color-accent)" }} />
          <div className="min-w-0">
            <h1
              className="text-2xl font-bold font-[family-name:var(--font-display)] truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t("pos", "title")}
            </h1>
            <p
              className="text-sm truncate"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("pos", "subtitle")}
            </p>
          </div>
        </div>

        {/* Reset / start-over button. Always visible while a sale is in
            progress so the operator can wipe and restart at any moment.
            Hidden once the sale lands on pending/success — those screens
            already have their own "Nueva venta" buttons. */}
        {step !== "pending" && step !== "success" && (
          <button
            onClick={handleRequestReset}
            title={
              language === "es"
                ? "Limpia el panel y comienza una venta nueva"
                : "Clear the panel and start a fresh sale"
            }
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border-default text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">
              {language === "es" ? "Comenzar de cero" : "Start over"}
            </span>
          </button>
        )}
      </motion.div>

      {/* Step indicator */}
      {step !== "pending" && step !== "success" && (
        <motion.div variants={fadeInUp}>
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon = STEP_ICONS[s];
              const isActive = s === step;
              const isCompleted = STEPS.indexOf(s) < currentStepIndex;

              return (
                <div key={s} className="flex items-center flex-1">
                  <button
                    onClick={() => {
                      if (isCompleted) setStep(s);
                    }}
                    disabled={!isCompleted}
                    className="flex items-center gap-2 flex-1 cursor-pointer disabled:cursor-default"
                    style={{ background: "none", border: "none" }}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: isActive
                          ? "var(--color-accent)"
                          : isCompleted
                          ? "var(--color-accent-subtle)"
                          : "var(--color-bg-glass)",
                        border: isActive
                          ? "none"
                          : isCompleted
                          ? "1px solid var(--color-border-accent)"
                          : "1px solid var(--color-border-default)",
                      }}
                    >
                      {isCompleted ? (
                        <Check
                          size={14}
                          style={{ color: "var(--color-accent)" }}
                        />
                      ) : (
                        <Icon
                          size={14}
                          style={{
                            color: isActive
                              ? "white"
                              : "var(--color-text-muted)",
                          }}
                        />
                      )}
                    </div>
                    <span
                      className="text-xs font-medium hidden sm:block truncate"
                      style={{
                        color: isActive
                          ? "var(--color-accent)"
                          : isCompleted
                          ? "var(--color-text-primary)"
                          : "var(--color-text-muted)",
                      }}
                    >
                      {stepLabel(s)}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-shrink-0 mx-1"
                      style={{
                        width: 20,
                        height: 1,
                        background:
                          STEPS.indexOf(s) < currentStepIndex
                            ? "var(--color-accent)"
                            : "var(--color-border-default)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Step content */}
      <motion.div variants={fadeInUp}>
        <Card>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === "client" && (
                <POSClientSelector
                  selected={client}
                  onSelect={(c) => {
                    setClient(c);
                    // Auto-advance after selection
                    setTimeout(() => setStep("items"), 300);
                  }}
                />
              )}

              {step === "items" && (
                <POSItemSelector
                  items={items}
                  onItemsChange={setItems}
                  unassignedIndexes={unassignedItemIndexes}
                />
              )}

              {step === "review" && client && (
                <POSOrderReview
                  client={client}
                  items={items}
                  selectedStylistId={stylistId}
                  onStylistChange={setStylistId}
                  discount={discount}
                  onDiscountChange={setDiscount}
                />
              )}

              {step === "payment" && client && (
                <POSPaymentSelector
                  total={total}
                  onPayCounter={handleCounterStyleMethod}
                  onSendRequest={handleSendRequest}
                  isProcessing={isProcessing}
                />
              )}

              {step === "pending" && (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <POSPendingView
                    invoiceId={lastInvoiceId || ""}
                    amount={total}
                    clientName={client?.name || ""}
                    language={language}
                    onNewSale={handleNewSale}
                    onPaid={() => {
                      setStep("success");
                    }}
                  />
                </motion.div>
              )}

              {step === "success" && client && (
                <POSSuccessView
                  total={total}
                  clientName={client.name}
                  paymentMethod={lastPaymentMethod}
                  onNewSale={handleNewSale}
                  onSaveNote={(text) => {
                    addNote({
                      clientId: client.id,
                      text,
                      source: "pos-sale",
                      ...(lastInvoiceId ? { invoiceId: lastInvoiceId } : {}),
                      ...(currentStaff?.id ? { createdBy: currentStaff.id } : {}),
                      ...(currentStaff?.name
                        ? { createdByName: currentStaff.name }
                        : {}),
                    });
                    addToast(
                      language === "es"
                        ? "Nota agregada al perfil"
                        : "Note added to profile",
                      "success"
                    );
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Navigation buttons */}
      {step !== "pending" && step !== "success" && step !== "payment" && (
        <motion.div
          variants={fadeInUp}
          className="flex items-center justify-between gap-2 flex-wrap"
        >
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <Button variant="ghost" onClick={goBack}>
                <ChevronLeft size={16} />
                {t("pos", "back")}
              </Button>
            )}
            {/* Save current cart as a draft. Disabled when there's nothing
                worth saving (empty cart with no client+stylist combo). */}
            <Button
              variant="ghost"
              onClick={handleSaveDraft}
              disabled={!isCartDraftWorthy(client, items, stylistId)}
              title={
                language === "es"
                  ? "Pausa esta venta y guárdala para retomarla luego"
                  : "Pause this sale and save it to pick up later"
              }
            >
              <Save size={16} />
              {language === "es" ? "Guardar borrador" : "Save draft"}
            </Button>
          </div>
          <div>
            {step !== "review" ? (
              <Button
                onClick={goNext}
                disabled={!canGoNext()}
              >
                {t("pos", "next")}
                <ChevronRight size={16} />
              </Button>
            ) : (
              <Button
                onClick={goNext}
                disabled={!canGoNext()}
              >
                {t("pos", "continueToPay")}
                <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Saved drafts — sit under the main card so the operator sees
          pending work at a glance. Hidden while in pending/success states
          since the operator's focus is on finishing the current sale. */}
      {step !== "pending" && step !== "success" && drafts.length > 0 && (
        <motion.div variants={fadeInUp}>
          <POSDraftsList
            drafts={drafts}
            onResume={handleResumeDraft}
            onDelete={handleDeleteDraft}
          />
        </motion.div>
      )}

      {/* Reset confirmation. Only mounts when the cart has meaningful
          state; empty carts skip the prompt entirely. */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title={
          language === "es" ? "¿Comenzar de cero?" : "Start over?"
        }
        message={
          language === "es"
            ? "Esto vacía el cliente, los items y el descuento de la venta actual. Si querés conservarla, cancelá y usá \"Guardar borrador\" primero."
            : "This wipes the client, items, and discount of the current sale. If you want to keep it, cancel and use \"Save draft\" first."
        }
        confirmLabel={
          language === "es" ? "Sí, comenzar de cero" : "Yes, start over"
        }
        cancelLabel={language === "es" ? "Cancelar" : "Cancel"}
        variant="warning"
        onConfirm={confirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </motion.div>
  );
}
