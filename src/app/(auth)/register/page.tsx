"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Registration is now automatic via phone login
    router.replace("/login");
  }, [router]);

  return null;
}
