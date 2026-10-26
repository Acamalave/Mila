import type { Metadata, Viewport } from "next";
import { Inter, Montserrat, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import AppProviders from "@/providers/AppProviders";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-accent",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const SITE_URL = "https://milapty.com";
const SITE_DESCRIPTION =
  "Milà Concept es un salón de belleza exclusivo en Ciudad de Panamá: coloración de lujo, balayage, cortes, tratamientos capilares, peinados y maquillaje profesional. Reserva tu cita con nuestras especialistas.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Milà Concept | Salón de Belleza en Ciudad de Panamá",
    template: "%s | Milà Concept",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "salón de belleza Panamá",
    "peluquería Ciudad de Panamá",
    "balayage Panamá",
    "coloración de cabello",
    "tratamientos capilares",
    "maquillaje profesional Panamá",
    "cortes de cabello",
    "Milà Concept",
    "Mila Concept",
  ],
  alternates: { canonical: "/" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Milà Concept",
  },
  openGraph: {
    type: "website",
    locale: "es_PA",
    alternateLocale: "en_US",
    url: SITE_URL,
    siteName: "Milà Concept",
    title: "Milà Concept | Salón de Belleza de Lujo en Ciudad de Panamá",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/logo-mila-brand.png",
        width: 1200,
        height: 630,
        alt: "Milà Concept — Salón de belleza en Ciudad de Panamá",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Milà Concept | Salón de Belleza en Ciudad de Panamá",
    description: SITE_DESCRIPTION,
    images: ["/logo-mila-brand.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="dark">
      <body
        className={`${inter.variable} ${montserrat.variable} ${cormorant.variable} antialiased`}
      >
        <ErrorBoundary>
          <AppProviders>{children}</AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
