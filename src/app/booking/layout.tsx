"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Booking is now on the home page
    router.replace("/");
  }, [router]);

  return <>{children}</>;
}
