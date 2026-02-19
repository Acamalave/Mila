"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { Instagram, MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer style={{ background: "var(--color-bg-page)", borderTop: "1px solid var(--color-border-default)", transition: "background 0.3s ease, border-color 0.3s ease" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Image
              src="/logo-mila.png"
              alt="Mila Concept"
              width={130}
              height={52}
              className="h-10 w-auto object-contain opacity-90"
            />
            <p className="text-sm leading-relaxed mt-4" style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}>
              {t("footer", "description")}
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="#"
                className="transition-colors"
                style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}
                aria-label="Instagram"
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}
            >
              {t("footer", "quickLinks")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-sm transition-colors"
                  style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                >
                  {t("nav", "home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm transition-colors"
                  style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                >
                  {t("nav", "login")}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm transition-colors"
                  style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                >
                  {t("nav", "dashboard")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}
            >
              {t("footer", "contact")}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}>
                <MapPin size={14} className="flex-shrink-0" style={{ color: "var(--color-accent-dark)", transition: "color 0.3s ease" }} />
                <span>123 Luxury Ave, Miami FL 33101</span>
              </li>
              <li className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}>
                <Phone size={14} className="flex-shrink-0" style={{ color: "var(--color-accent-dark)", transition: "color 0.3s ease" }} />
                <span>(305) 555-0199</span>
              </li>
              <li className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}>
                <Mail size={14} className="flex-shrink-0" style={{ color: "var(--color-accent-dark)", transition: "color 0.3s ease" }} />
                <span>hello@milaconcept.com</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--color-text-secondary)", transition: "color 0.3s ease" }}
            >
              {t("footer", "hours")}
            </h4>
            <ul className="space-y-3 text-sm" style={{ color: "var(--color-text-muted)", transition: "color 0.3s ease" }}>
              <li>{t("footer", "monFri")}</li>
              <li>{t("footer", "saturday")}</li>
              <li>{t("footer", "sunday")}</li>
            </ul>
          </div>
        </div>

        <div
          className="mt-16 pt-8 text-center"
          style={{ borderTop: "1px solid var(--color-border-default)", transition: "border-color 0.3s ease" }}
        >
          <p className="text-xs" style={{ color: "var(--color-text-muted)", opacity: 0.7, transition: "color 0.3s ease" }}>
            &copy; {new Date().getFullYear()} Mila Concept. {t("footer", "rights")}
          </p>
          <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted)", opacity: 0.55, transition: "color 0.3s ease" }}>
            Desarrollado por{" "}
            <a
              href="https://wa.me/50768204698"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: "var(--color-accent-dark)", transition: "color 0.3s ease" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-accent-dark)")}
            >
              Acacio Malavé
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
