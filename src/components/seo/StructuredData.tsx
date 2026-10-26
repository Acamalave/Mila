// Server component — emits schema.org JSON-LD so Google and social crawlers
// read the salon's real business data (name, address, hours, rating, services)
// even though the interactive landing is client-rendered. This is the
// machine-readable "server-generated text" that powers Google local results
// and the Business Profile knowledge panel. No "use client" on purpose.

const SITE_URL = "https://milapty.com";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "BeautySalon",
  "@id": `${SITE_URL}/#salon`,
  name: "Milà Concept",
  alternateName: "Mila Concept",
  description:
    "Salón de belleza exclusivo en Ciudad de Panamá especializado en coloración de lujo, balayage, cortes, tratamientos capilares, peinados y maquillaje profesional.",
  url: SITE_URL,
  image: `${SITE_URL}/logo-mila-brand.png`,
  logo: `${SITE_URL}/logo-mila-brand.png`,
  telephone: "+507 6583-0099",
  priceRange: "$$$",
  currenciesAccepted: "USD",
  address: {
    "@type": "PostalAddress",
    streetAddress: "P.H. Balboa Office Center, Piso 18, Oficina 18 C2, Calle 27 Este",
    addressLocality: "Ciudad de Panamá",
    addressCountry: "PA",
  },
  areaServed: {
    "@type": "City",
    name: "Ciudad de Panamá",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "19:00",
    },
  ],
  sameAs: ["https://www.instagram.com/milaconceptpty/"],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    reviewCount: "24",
  },
  makesOffer: [
    "Coloración de cabello",
    "Balayage",
    "Cortes de cabello",
    "Tratamientos capilares",
    "Peinados",
    "Maquillaje profesional",
  ].map((name) => ({
    "@type": "Offer",
    itemOffered: { "@type": "Service", name },
  })),
};

export default function StructuredData() {
  return (
    <script
      type="application/ld+json"
      // Static, developer-authored object — safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
