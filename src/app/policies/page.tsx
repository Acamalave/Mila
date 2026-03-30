"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  CalendarX2,
  CreditCard,
  Wallet,
  Scissors,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";

const POLICIES = [
  {
    icon: CalendarX2,
    title: { es: "Reservaciones", en: "Reservations" },
    content: {
      es: "Las cancelaciones deben notificarse con al menos 24 horas de anticipaci\u00f3n. Las cancelaciones tard\u00edas o la no asistencia sin previo aviso resultar\u00e1n en la p\u00e9rdida del dep\u00f3sito realizado.",
      en: "Cancellations must be notified at least 24 hours in advance. Late cancellations or no-shows without prior notice will result in forfeiture of the deposit made.",
    },
  },
  {
    icon: Wallet,
    title: { es: "Dep\u00f3sitos y Abonos", en: "Deposits & Prepayments" },
    content: {
      es: "Algunos servicios requieren un pago anticipado para confirmar la reserva. El monto del dep\u00f3sito se descuenta de la factura final. Los dep\u00f3sitos no son reembolsables en caso de cancelaci\u00f3n tard\u00eda o no asistencia.",
      en: "Some services require an advance payment to confirm the booking. The deposit amount is deducted from the final invoice. Deposits are non-refundable in case of late cancellation or no-show.",
    },
  },
  {
    icon: CreditCard,
    title: { es: "Pagos", en: "Payments" },
    content: {
      es: "Aceptamos pagos con tarjeta a trav\u00e9s de Paguelo F\u00e1cil. Tambi\u00e9n aceptamos pagos presenciales en el sal\u00f3n. Los pagos en l\u00ednea se procesan de forma segura.",
      en: "We accept card payments via Paguelo F\u00e1cil. We also accept counter payments at the salon. Online payments are processed securely.",
    },
  },
  {
    icon: Scissors,
    title: { es: "Servicios", en: "Services" },
    content: {
      es: "La duraci\u00f3n y el precio de los servicios pueden variar seg\u00fan el tipo de cabello y la complejidad del trabajo. El precio final se confirma en el sal\u00f3n tras la evaluaci\u00f3n del especialista.",
      en: "Service duration and pricing may vary based on hair type and work complexity. The final price is confirmed at the salon after specialist evaluation.",
    },
  },
  {
    icon: ShieldCheck,
    title: { es: "Privacidad", en: "Privacy" },
    content: {
      es: "Protegemos tu informaci\u00f3n personal. Los n\u00fameros de tel\u00e9fono se utilizan \u00fanicamente para la gesti\u00f3n de reservas y comunicaci\u00f3n directa. No compartimos tus datos con terceros.",
      en: "We protect your personal information. Phone numbers are used only for booking management and direct communication. We do not share your data with third parties.",
    },
  },
];

export default function PoliciesPage() {
  const { language } = useLanguage();

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-bg-page)" }}
    >
      {/* Header */}
      <header className="relative pt-10 pb-16 text-center px-6">
        {/* Back link */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-1.5 text-xs transition-colors duration-300"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--color-accent)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--color-text-muted)")
          }
        >
          <ChevronLeft size={14} />
          {language === "es" ? "Volver" : "Back"}
        </Link>

        <Image
          src="/logo-mila-brand.png"
          alt="Mil\u00e0 Concept"
          width={120}
          height={48}
          className="h-8 w-auto object-contain mx-auto mb-6 opacity-90"
        />
        <h1
          className="text-[11px] font-semibold uppercase tracking-[0.35em] mb-3"
          style={{ color: "var(--color-accent)" }}
        >
          {language === "es"
            ? "Pol\u00edticas del Sal\u00f3n"
            : "Salon Policies"}
        </h1>
        <p
          className="text-sm font-light max-w-md mx-auto leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          {language === "es"
            ? "Transparencia y confianza son la base de nuestra experiencia."
            : "Transparency and trust are the foundation of our experience."}
        </p>
        {/* Decorative line */}
        <div
          className="w-12 h-px mx-auto mt-8"
          style={{ background: "var(--gradient-accent-h)" }}
        />
      </header>

      {/* Policy cards */}
      <section className="max-w-2xl mx-auto px-6 pb-20 space-y-5">
        {POLICIES.map((policy, i) => {
          const Icon = policy.icon;
          return (
            <article
              key={i}
              className="rounded-xl p-6 transition-all duration-300 hover:translate-y-[-1px]"
              style={{
                background: "var(--color-bg-card, rgba(255,255,255,0.02))",
                border: "1px solid var(--color-border-accent, rgba(196,164,118,0.12))",
              }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      "var(--color-accent-subtle, rgba(196,164,118,0.08))",
                    border:
                      "1px solid var(--color-border-accent, rgba(196,164,118,0.15))",
                  }}
                >
                  <Icon
                    size={17}
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {policy.title[language]}
                  </h2>
                  <p
                    className="text-[13px] leading-relaxed font-light"
                    style={{ color: "var(--color-text-secondary, #bbb)" }}
                  >
                    {policy.content[language]}
                  </p>
                </div>
              </div>
            </article>
          );
        })}

        {/* Footer note */}
        <div className="text-center pt-8">
          <p
            className="text-[10px] font-light leading-relaxed max-w-sm mx-auto"
            style={{ color: "var(--color-text-muted)", opacity: 0.7 }}
          >
            {language === "es"
              ? "Al reservar con Mil\u00e0 Concept, aceptas estas pol\u00edticas. Si tienes preguntas, cont\u00e1ctanos por WhatsApp."
              : "By booking with Mil\u00e0 Concept, you agree to these policies. If you have questions, contact us via WhatsApp."}
          </p>
        </div>
      </section>
    </div>
  );
}
