import type { Metadata } from "next";
import StructuredData from "@/components/seo/StructuredData";
import HomeClient from "./HomeClient";

// Server component wrapper for the landing page. It exists so the home route
// can emit real server-rendered SEO — page-specific metadata and schema.org
// JSON-LD — that crawlers read without executing JavaScript. The interactive
// experience lives in HomeClient ("use client"), unchanged.
export const metadata: Metadata = {
  title: "Milà Concept | Salón de Belleza de Lujo en Ciudad de Panamá",
  description:
    "Reserva en Milà Concept, salón de belleza exclusivo en Ciudad de Panamá: balayage, coloración de lujo, cortes, tratamientos capilares, peinados y maquillaje profesional. Lun a Sáb, 9AM–7PM.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <StructuredData />
      <HomeClient />
    </>
  );
}
