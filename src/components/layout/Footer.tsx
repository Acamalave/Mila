"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { Instagram, MapPin, Phone, Clock, MessageCircle } from "lucide-react";

const WAZE_LINK =
  "https://waze.com/ul?a=share_drive&locale=es-419&sd=p5m4EYaaJiC57uFqZg-sd&env=row&utm_source=waze_app&utm_campaign=share_drive";
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Image
              src="/logo-mila.png"
              alt="Mila Concept"
              width={130}
              height={52}
              className="h-10 w-auto object-contain opacity-90"
            />
            <p
              className="text-sm leading-relaxed mt-4"
              style={{
                color: "var(--color-text-muted)",
                transition: "color 0.3s ease",
              }}
            >
              {t("footer", "description")}
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href={INSTAGRAM_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{
                  color: "var(--color-text-muted)",
                  transition: "color 0.3s ease",
                }}
                aria-label="Instagram"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--color-accent)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--color-text-muted)")
                }
              >
                <Instagram size={20} />
              </a>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{
                  color: "var(--color-text-muted)",
                  transition: "color 0.3s ease",
                }}
                aria-label="WhatsApp"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "#25d366")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--color-text-muted)")
                }
              >
                <MessageCircle size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{
                color: "var(--color-text-secondary)",
                transition: "color 0.3s ease",
              }}
            >
              {t("footer", "quickLinks")}
            </h4>
            <ul className="space-y-3">
              {[
                { href: "/", label: t("nav", "home") },
                { href: "/booking", label: t("nav", "bookNow") },
                { href: "/login", label: t("nav", "login") },
                { href: "/dashboard", label: t("nav", "dashboard") },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors"
                    style={{
                      color: "var(--color-text-muted)",
                      transition: "color 0.3s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--color-accent)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--color-text-muted)")
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{
                color: "var(--color-text-secondary)",
                transition: "color 0.3s ease",
              }}
            >
              {t("footer", "contact")}
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href={WAZE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-sm transition-colors"
                  style={{
                    color: "var(--color-text-muted)",
                    transition: "color 0.3s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--color-accent)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--color-text-muted)")
                  }
                >
                  <MapPin
                    size={14}
                    className="flex-shrink-0 mt-0.5"
                    style={{
                      color: "var(--color-accent-dark)",
                      transition: "color 0.3s ease",
                    }}
                  />
                  <span>
                    P.H. Balboa Office Center, Calle 27 Este, Panam&aacute;
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm transition-colors"
                  style={{
                    color: "var(--color-text-muted)",
                    transition: "color 0.3s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#25d366")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--color-text-muted)")
                  }
                >
                  <Phone
                    size={14}
                    className="flex-shrink-0"
                    style={{
                      color: "var(--color-accent-dark)",
                      transition: "color 0.3s ease",
                    }}
                  />
                  <span>+507 6583-0099</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{
                color: "var(--color-text-secondary)",
                transition: "color 0.3s ease",
              }}
            >
              {t("footer", "hours")}
            </h4>
            <ul
              className="space-y-3 text-sm"
              style={{
                color: "var(--color-text-muted)",
                transition: "color 0.3s ease",
              }}
            >
              <li className="flex items-center gap-2">
                <Clock
                  size={14}
                  className="flex-shrink-0"
                  style={{
                    color: "var(--color-accent-dark)",
                    transition: "color 0.3s ease",
                  }}
                />
                <span>
                  {language === "es"
                    ? "Lunes a Sábado: 8AM - 7PM"
                    : "Mon - Sat: 8AM - 7PM"}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Clock
                  size={14}
                  className="flex-shrink-0"
                  style={{
                    color: "var(--color-accent-dark)",
                    transition: "color 0.3s ease",
                  }}
                />
                <span>
                  {language === "es" ? "Domingo: Cerrado" : "Sunday: Closed"}
                </span>
              </li>
            </ul>

            {/* Promo */}
            <div
              className="mt-5 p-3 rounded-lg"
              style={{
                background: "var(--color-accent-subtle)",
                border: "1px solid var(--color-border-default)",
                transition: "all 0.3s ease",
              }}
            >
              <p
                className="text-xs font-medium"
                style={{
                  color: "var(--color-accent)",
                  transition: "color 0.3s ease",
                }}
              >
                {language === "es"
                  ? "Promo de apertura: 10%-15% clientes frecuentes"
                  : "Opening promo: 10%-15% for frequent clients"}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-16 pt-8 text-center"
          style={{
            borderTop: "1px solid var(--color-border-default)",
            transition: "border-color 0.3s ease",
          }}
        >
          <p
            className="text-xs"
            style={{
              color: "var(--color-text-muted)",
              opacity: 0.7,
              transition: "color 0.3s ease",
            }}
          >
            &copy; {new Date().getFullYear()} Mila Concept.{" "}
            {t("footer", "rights")}
          </p>
          <p
            className="mt-3 text-xs"
            style={{
              color: "var(--color-text-muted)",
              opacity: 0.55,
              transition: "color 0.3s ease",
            }}
          >
            {language === "es" ? "Desarrollado por" : "Developed by"}{" "}
            <a
              href="https://accios.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors font-medium"
              style={{
                color: "var(--color-accent-dark)",
                transition: "color 0.3s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--color-accent)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--color-accent-dark)")
              }
            >
              Accios Core
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
