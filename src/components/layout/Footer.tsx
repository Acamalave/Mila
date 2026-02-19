"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { Instagram, MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer style={{ background: "#080808", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
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
            <p className="text-sm leading-relaxed mt-4" style={{ color: "#6B6560" }}>
              {t("footer", "description")}
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="#"
                className="transition-colors"
                style={{ color: "#6B6560" }}
                aria-label="Instagram"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#C4A96A")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6560")}
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: "#ABA595" }}
            >
              {t("footer", "quickLinks")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-sm transition-colors"
                  style={{ color: "#6B6560" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#C4A96A")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6560")}
                >
                  {t("nav", "home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm transition-colors"
                  style={{ color: "#6B6560" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#C4A96A")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6560")}
                >
                  {t("nav", "login")}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm transition-colors"
                  style={{ color: "#6B6560" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#C4A96A")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6560")}
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
              style={{ color: "#ABA595" }}
            >
              {t("footer", "contact")}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm" style={{ color: "#6B6560" }}>
                <MapPin size={14} className="flex-shrink-0" style={{ color: "#8E7B54" }} />
                <span>123 Luxury Ave, Miami FL 33101</span>
              </li>
              <li className="flex items-center gap-2 text-sm" style={{ color: "#6B6560" }}>
                <Phone size={14} className="flex-shrink-0" style={{ color: "#8E7B54" }} />
                <span>(305) 555-0199</span>
              </li>
              <li className="flex items-center gap-2 text-sm" style={{ color: "#6B6560" }}>
                <Mail size={14} className="flex-shrink-0" style={{ color: "#8E7B54" }} />
                <span>hello@milaconcept.com</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: "#ABA595" }}
            >
              {t("footer", "hours")}
            </h4>
            <ul className="space-y-3 text-sm" style={{ color: "#6B6560" }}>
              <li>{t("footer", "monFri")}</li>
              <li>{t("footer", "saturday")}</li>
              <li>{t("footer", "sunday")}</li>
            </ul>
          </div>
        </div>

        <div
          className="mt-16 pt-8 text-center"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}
        >
          <p className="text-xs" style={{ color: "#4A4540" }}>
            &copy; {new Date().getFullYear()} Mila Concept. {t("footer", "rights")}
          </p>
          <p className="mt-3 text-xs" style={{ color: "#3A3530" }}>
            Desarrollado por{" "}
            <a
              href="https://wa.me/50768204698"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: "#8E7B54" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#C4A96A")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#8E7B54")}
            >
              Acacio Malavé
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
