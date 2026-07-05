"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The stylist area was reduced to earnings + schedule. This route is kept
// only so old links/bookmarks land somewhere sensible.
export default function RemovedStylistPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/stylist/earnings");
  }, [router]);

  return null;
}
