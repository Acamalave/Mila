"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { Instagram, MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-mila-espresso text-mila-sage">
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
            <p className="text-sm leading-relaxed text-mila-taupe mt-4">
              {t("footer", "description")}
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="#"
                className="text-mila-taupe hover:text-mila-gold transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-mila-ivory uppercase tracking-wider mb-4">
              {t("footer", "quickLinks")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm text-mila-taupe hover:text-mila-gold transition-colors">
                  {t("nav", "home")}
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-mila-taupe hover:text-mila-gold transition-colors">
                  {t("nav", "login")}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-mila-taupe hover:text-mila-gold transition-colors">
                  {t("nav", "dashboard")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-mila-ivory uppercase tracking-wider mb-4">
              {t("footer", "contact")}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-mila-taupe">
                <MapPin size={14} className="text-mila-gold flex-shrink-0" />
                <span>123 Luxury Ave, Miami FL 33101</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-mila-taupe">
                <Phone size={14} className="text-mila-gold flex-shrink-0" />
                <span>(305) 555-0199</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-mila-taupe">
                <Mail size={14} className="text-mila-gold flex-shrink-0" />
                <span>hello@milaconcept.com</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-sm font-semibold text-mila-ivory uppercase tracking-wider mb-4">
              {t("footer", "hours")}
            </h4>
            <ul className="space-y-3 text-sm text-mila-taupe">
              <li>{t("footer", "monFri")}</li>
              <li>{t("footer", "saturday")}</li>
              <li>{t("footer", "sunday")}</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-xs text-mila-taupe">
            &copy; {new Date().getFullYear()} Mila Concept. {t("footer", "rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
