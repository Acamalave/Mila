"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The stylist area exposes only earnings + schedule; earnings is the landing
// page. Login and the header still send stylists to /stylist, so this route
// forwards them (client-side — the auth guard lives in the layout).
export default function StylistIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/stylist/earnings");
  }, [router]);

  return null;
}
