"use client";

import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { Instagram, MapPin, Phone, Clock, MessageCircle } from "lucide-react";

const LOCATION_LINK =
  "https://maps.app.goo.gl/nLgCPhrNMXrHgAPMA";
const WHATSAPP_LINK = "https://wa.me/50765830099";
const INSTAGRAM_LINK = "https://www.instagram.com/milaconcept";

export default function Footer() {
  const { t, language } = useLanguage();

  return (
    <footer
      style={{
        background: "var(--color-bg-page)",
        borderTop: "1px solid var(--color-border-default)",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Centered brand + socials */}
        <div className="flex flex-col items-center text-center mb-10">
          <Image
            src="/logo-mila-brand.png"
            alt="Milà Concept"
            width={110}
            height={44}
            className="h-7 w-auto object-contain opacity-80"
          />
          <p
            className="text-sm leading-relaxed mt-3 max-w-sm"
            style={{
              color: "var(--color-text-muted)",
              transition: "color 0.3s ease",
            }}
          >
            {t("footer", "description")}
          </p>
          <div className="flex gap-5 mt-5">
            <a
              href={INSTAGRAM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}
              aria-label="Instagram"
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
              <Instagram size={18} />
            </a>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}
              aria-label="WhatsApp"
              onMouseEnter={(e) => (e.currentTarget.style.color = "#25d366")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
              <MessageCircle size={18} />
            </a>
          </div>
        </div>

        {/* Info columns — Contact & Hours, centered */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-md mx-auto">
          {/* Contact */}
          <div className="text-center sm:text-left">
            <h4
              className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3"
              style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}
            >
              {t("footer", "contact")}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href={LOCATION_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-2 text-xs transition-colors"
                  style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                >
                  <MapPin size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-accent-dark)" }} />
                  <span>P.H. Balboa Office Center, Calle 27 Este, Panam&aacute;</span>
                </a>
              </li>
              <li>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs transition-colors"
                  style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#25d366")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                >
                  <Phone size={12} className="flex-shrink-0" style={{ color: "var(--color-accent-dark)" }} />
                  <span>+507 6583-0099</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div className="text-center sm:text-left">
            <h4
              className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3"
              style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}
            >
              {t("footer", "hours")}
            </h4>
            <ul className="space-y-2.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <li className="inline-flex items-center gap-2">
                <Clock size={12} className="flex-shrink-0" style={{ color: "var(--color-accent-dark)" }} />
                <span>{language === "es" ? "Lunes a Sábado: 8AM - 7PM" : "Mon - Sat: 8AM - 7PM"}</span>
              </li>
              <li className="inline-flex items-center gap-2">
                <Clock size={12} className="flex-shrink-0" style={{ color: "var(--color-accent-dark)" }} />
                <span>{language === "es" ? "Domingo: Cerrado" : "Sunday: Closed"}</span>
              </li>
            </ul>

            {/* Promo */}
            <div
              className="mt-4 p-2.5 rounded-lg inline-block"
              style={{
                background: "var(--color-accent-subtle)",
                border: "1px solid var(--color-border-default)",
                transition: "all 0.3s ease",
              }}
            >
              <p className="text-[10px] font-medium" style={{ color: "var(--color-accent)" }}>
                {language === "es"
                  ? "Promo de apertura: 10%-15% clientes frecuentes"
                  : "Opening promo: 10%-15% for frequent clients"}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 pt-6 text-center"
          style={{ borderTop: "1px solid var(--color-border-default)", transition: "border-color 0.3s ease" }}
        >
          <p className="text-[10px]" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>
            &copy; {new Date().getFullYear()} Mila Concept. {t("footer", "rights")}
          </p>
          <p className="mt-2 text-[10px]" style={{ color: "var(--color-text-muted)", opacity: 0.55 }}>
            {language === "es" ? "Desarrollado por" : "Developed by"}{" "}
            <a
              href="https://accios.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors font-medium"
              style={{ color: "var(--color-accent-dark)", transition: "color 0.3s ease" }}
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
