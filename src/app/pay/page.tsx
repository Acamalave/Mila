"use client";

// =============================================================================
// /pay?invoice=<id>
//
// Public payment landing page. Given an invoice id (the link we email / send by
// WhatsApp, and the redirect target for the in-app payment modals), this page
// asks the server to build a Paguelo Facil hosted-checkout URL and forwards the
// customer there. The hosted page is where Paguelo Facil performs the 3D Secure
// challenge — which is exactly what the direct AUTH_CAPTURE flow could not do.
//
// No auth required: the customer opening this from their phone may not be
// logged in. They can only ever PAY an invoice here, never read its contents.
// =============================================================================

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";

type PayState =
  | { phase: "loading" }
  | { phase: "redirecting" }
  | { phase: "error"; message: string; alreadyPaid?: boolean };

function PayInner() {
  const params = useSearchParams();
  const invoiceId = params.get("invoice")?.trim() || "";
  const [state, setState] = useState<PayState>({ phase: "loading" });
  // Guard against React 18 StrictMode double-invoke in dev creating two links.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!invoiceId) {
      setState({
        phase: "error",
        message: "Falta el número de factura en el enlace.",
      });
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/payments/create-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId }),
        });
        const data = await res.json();

        if (res.status === 409) {
          setState({
            phase: "error",
            alreadyPaid: true,
            message: "Esta factura ya fue pagada. ¡Gracias!",
          });
          return;
        }

        if (!res.ok || !data.success || !data.linkUrl) {
          setState({
            phase: "error",
            message:
              data.error ||
              "No pudimos preparar el pago. Intenta de nuevo o contáctanos.",
          });
          return;
        }

        // Hand off to Paguelo Facil's hosted page (3D Secure happens there).
        setState({ phase: "redirecting" });
        window.location.href = data.linkUrl;
      } catch {
        setState({
          phase: "error",
          message: "Error de conexión. Por favor intenta de nuevo.",
        });
      }
    })();
  }, [invoiceId]);

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--color-bg-page)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border-default)",
          boxShadow: "var(--shadow-float)",
        }}
      >
        {(state.phase === "loading" || state.phase === "redirecting") && (
          <>
            <div className="flex justify-center mb-5">
              <Loader2
                size={40}
                className="animate-spin"
                style={{ color: "var(--color-accent)" }}
              />
            </div>
            <h1
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              {state.phase === "redirecting"
                ? "Redirigiendo al pago seguro…"
                : "Preparando tu pago…"}
            </h1>
            <p
              className="text-sm flex items-center justify-center gap-1.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              <ShieldCheck size={14} style={{ color: "var(--color-accent)" }} />
              Pago seguro vía Paguelo Fácil
            </p>
          </>
        )}

        {state.phase === "error" && (
          <>
            <div className="flex justify-center mb-5">
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 64,
                  height: 64,
                  background: state.alreadyPaid
                    ? "rgba(34,197,94,0.12)"
                    : "rgba(239,68,68,0.12)",
                }}
              >
                {state.alreadyPaid ? (
                  <ShieldCheck size={30} style={{ color: "#22c55e" }} />
                ) : (
                  <AlertCircle size={30} style={{ color: "#ef4444" }} />
                )}
              </div>
            </div>
            <h1
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              {state.alreadyPaid ? "Factura pagada" : "No se pudo iniciar el pago"}
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {state.message}
            </p>
            {!state.alreadyPaid && invoiceId && (
              <button
                onClick={() => window.location.reload()}
                className="mt-6 w-full py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: "var(--gradient-accent)",
                  color: "var(--color-text-inverse)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Intentar de nuevo
              </button>
            )}
          </>
        )}
      </motion.div>
    </main>
  );
}

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen flex items-center justify-center"
          style={{ background: "var(--color-bg-page)" }}
        >
          <Loader2
            size={40}
            className="animate-spin"
            style={{ color: "var(--color-accent)" }}
          />
        </main>
      }
    >
      <PayInner />
    </Suspense>
  );
}
