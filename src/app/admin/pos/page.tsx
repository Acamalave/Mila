"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useInvoices } from "@/providers/InvoiceProvider";
import { usePayment } from "@/providers/PaymentProvider";
import { useToast } from "@/providers/ToastProvider";
import { calculateTaxBreakdown, generateId, formatPrice, getStoredData, setStoredData } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import POSClientSelector from "@/components/admin/pos/POSClientSelector";
import POSItemSelector from "@/components/admin/pos/POSItemSelector";
import POSOrderReview from "@/components/admin/pos/POSOrderReview";
import POSPaymentSelector from "@/components/admin/pos/POSPaymentSelector";
import POSPendingView from "@/components/admin/pos/POSPendingView";
import POSSuccessView from "@/components/admin/pos/POSSuccessView";
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
} from "lucide-react";
import type { InvoiceItem } from "@/types";
import type { POSClient } from "@/components/admin/pos/POSClientSelector";

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
  const { addInvoice, createAndPayInvoice } = useInvoices();
  const { processCounterPayment } = usePayment();
  const { addToast } = useToast();

  const savedCart = getStoredData<{ client: POSClient | null; items: InvoiceItem[]; stylistId: string | null } | null>("mila-pos-cart", null);
  const [step, setStep] = useState<Step>(savedCart?.items?.length ? "items" : "client");
  const [client, setClient] = useState<POSClient | null>(savedCart?.client ?? null);
  const [items, setItems] = useState<InvoiceItem[]>(savedCart?.items ?? []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<"card" | "counter">("counter");
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);
  const [stylistId, setStylistId] = useState<string | null>(savedCart?.stylistId ?? null);

  // Persist cart to localStorage
  useEffect(() => {
    if (step === "success" || step === "pending") {
      setStoredData("mila-pos-cart", null);
    } else {
      setStoredData("mila-pos-cart", { client, items, stylistId });
    }
  }, [client, items, stylistId, step]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const currentStepIndex = STEPS.indexOf(step);

  const canGoNext = useCallback(() => {
    switch (step) {
      case "client":
        return !!client;
      case "items":
        return items.length > 0;
      case "review":
        return true;
      default:
        return false;
    }
  }, [step, client, items]);

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

  const handlePayCounter = async (note: string) => {
    if (!client) return;
    setIsProcessing(true);

    await new Promise((r) => setTimeout(r, 500));

    const { subtotal, taxAmount, taxRate } = calculateTaxBreakdown(total);

    // Create paid invoice in one step
    const invoice = createAndPayInvoice(
      {
        clientId: client.id,
        clientName: client.name,
        amount: total,
        subtotal,
        taxAmount,
        taxRate,
        items,
        paymentMethod: "counter",
        counterNote: note,
        status: "paid",
        date: new Date().toISOString().split("T")[0],
        description:
          language === "es"
            ? "Venta en punto de venta"
            : "Point of sale transaction",
        ...(stylistId ? { stylistId } : {}),
      } as Omit<typeof invoice, "id" | "createdAt">,
      `txn-counter-${generateId()}`
    );

    // Record counter payment
    processCounterPayment(invoice.id, total, note);

    setLastPaymentMethod("counter");
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

    const { subtotal, taxAmount, taxRate } = calculateTaxBreakdown(total);

    // Create invoice as "sent" — this triggers NotificationProvider
    // to send a payment request to the client's dashboard
    const newInv = addInvoice({
      clientId: client.id,
      clientName: client.name,
      amount: total,
      subtotal,
      taxAmount,
      taxRate,
      items,
      paymentMethod: "card",
      status: "sent",
      date: new Date().toISOString().split("T")[0],
      sentAt: new Date().toISOString(),
      description:
        language === "es"
          ? "Venta en punto de venta"
          : "Point of sale transaction",
      ...(stylistId ? { stylistId } : {}),
    } as Omit<typeof newInv, "id" | "createdAt">);

    setLastInvoiceId(newInv.id);

    addToast(
      language === "es"
        ? "Solicitud de pago enviada al cliente"
        : "Payment request sent to client",
      "success"
    );

    setLastPaymentMethod("card");
    setStep("pending");
  };

  const handleNewSale = () => {
    setStep("client");
    setClient(null);
    setItems([]);
    setStylistId(null);
    setIsProcessing(false);
    setStoredData("mila-pos-cart", null);
  };

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
      <motion.div variants={fadeInUp} className="flex items-center gap-3">
        <ShoppingCart size={24} style={{ color: "var(--color-accent)" }} />
        <div>
          <h1
            className="text-2xl font-bold font-[family-name:var(--font-display)]"
            style={{ color: "var(--color-text-primary)" }}
          >
            {t("pos", "title")}
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            {t("pos", "subtitle")}
          </p>
        </div>
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
                <POSItemSelector items={items} onItemsChange={setItems} />
              )}

              {step === "review" && client && (
                <POSOrderReview
                  client={client}
                  items={items}
                  selectedStylistId={stylistId}
                  onStylistChange={setStylistId}
                />
              )}

              {step === "payment" && client && (
                <POSPaymentSelector
                  total={total}
                  onPayCounter={handlePayCounter}
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
          className="flex items-center justify-between"
        >
          <div>
            {currentStepIndex > 0 && (
              <Button variant="ghost" onClick={goBack}>
                <ChevronLeft size={16} />
                {t("pos", "back")}
              </Button>
            )}
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
    </motion.div>
  );
}
