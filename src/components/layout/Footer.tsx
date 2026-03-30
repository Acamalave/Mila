"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { Instagram, MapPin, Phone, Clock, MessageCircle } from "lucide-react";

const LOCATION_LINK =
  "https://maps.app.goo.gl/nLgCPhrNMXrHgAPMA";
const WHATSAPP_LINK = "https://wa.me/50765830099";
const INSTAGRAM_LINK = "https://www.instagram.com/milaconceptpty/";

export default function Footer() {
  const { t, language } = useLanguage();

  return (
    <footer
      style={{
        background: "var(--color-bg-page)",
        borderTop: "1px solid var(--color-border-accent)",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-8 pt-14 pb-8">
        {/* ── Brand ── */}
        <div className="flex flex-col items-center text-center mb-10">
          <Image
            src="/logo-mila-brand.png"
            alt="Milà Concept"
            width={120}
            height={48}
            className="h-8 w-auto object-contain opacity-90"
          />
          <p
            className="text-[13px] leading-relaxed mt-3 max-w-xs font-light"
            style={{ color: "var(--color-text-muted)" }}
          >
            {t("footer", "description")}
          </p>

          {/* Social icons */}
          <div className="flex items-center gap-6 mt-5">
            <a
              href={INSTAGRAM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300"
              style={{
                border: "1px solid var(--color-border-accent)",
                color: "var(--color-text-muted)",
              }}
              aria-label="Instagram"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--color-accent)";
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.background = "var(--color-accent-subtle)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--color-text-muted)";
                e.currentTarget.style.borderColor = "var(--color-border-accent)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Instagram size={15} />
            </a>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300"
              style={{
                border: "1px solid var(--color-border-accent)",
                color: "var(--color-text-muted)",
              }}
              aria-label="WhatsApp"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#25d366";
                e.currentTarget.style.borderColor = "#25d366";
                e.currentTarget.style.background = "rgba(37,211,102,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--color-text-muted)";
                e.currentTarget.style.borderColor = "var(--color-border-accent)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <MessageCircle size={15} />
            </a>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="w-12 h-px mx-auto mb-10" style={{ background: "var(--gradient-accent-h)" }} />

        {/* ── Info Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 text-center mb-10">
          {/* Location */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-2.5">
              <MapPin size={13} style={{ color: "var(--color-accent)" }} />
              <h4
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-accent)" }}
              >
                {t("footer", "location")}
              </h4>
            </div>
            <a
              href={LOCATION_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] leading-relaxed transition-colors duration-300 block"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
              P.H. Balboa Office Center
              <br />
              Piso 18, Oficina 18 C2
              <br />
              Calle 27 Este, Panam&aacute;
            </a>
          </div>

          {/* Contact */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-2.5">
              <Phone size={13} style={{ color: "var(--color-accent)" }} />
              <h4
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-accent)" }}
              >
                {t("footer", "contact")}
              </h4>
            </div>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] transition-colors duration-300 block"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#25d366")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
              +507 6583-0099
            </a>
            <a
              href={INSTAGRAM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] transition-colors duration-300 block mt-1"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
              @milaconceptpty
            </a>
          </div>

          {/* Hours */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-2.5">
              <Clock size={13} style={{ color: "var(--color-accent)" }} />
              <h4
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--color-accent)" }}
              >
                {t("footer", "hours")}
              </h4>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              {language === "es" ? "Lun – Sáb" : "Mon – Sat"}: 9AM – 7PM
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>
              {language === "es" ? "Domingo: Cerrado" : "Sunday: Closed"}
            </p>
          </div>
        </div>

        {/* ── Promo badge ── */}
        <div className="flex justify-center mb-10">
          <div
            className="px-6 py-2 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{
              background: "var(--color-accent-subtle)",
              border: "1px solid var(--color-border-accent)",
              color: "var(--color-accent)",
            }}
          >
            {t("footer", "promo")}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="pt-6 text-center"
          style={{ borderTop: "1px solid var(--color-border-default)" }}
        >
          <div className="mb-3">
            <Link
              href="/policies"
              className="text-[10px] uppercase tracking-[0.15em] font-medium transition-colors duration-300"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
              {language === "es" ? "Pol\u00edticas" : "Policies"}
            </Link>
          </div>
          <p className="text-[10px]" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>
            &copy; {new Date().getFullYear()} Milà Concept. {t("footer", "rights")}
          </p>
          <p className="mt-1.5 text-[9px]" style={{ color: "var(--color-text-muted)", opacity: 0.4 }}>
            {language === "es" ? "Desarrollado por" : "Developed by"}{" "}
            <a
              href="https://accios.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-300 font-medium"
              style={{ color: "var(--color-accent-dark)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-accent-dark)")}
            >
              Accios Core
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
