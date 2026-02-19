"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Header from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return null;
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: "#060608" }}
    >
      {/* Gradient blobs for liquid glass effect */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse at 20% 20%, rgba(142, 123, 84, 0.08) 0%, transparent 60%)",
            "radial-gradient(ellipse at 80% 80%, rgba(107, 123, 141, 0.05) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="relative z-10 mx-auto w-full max-w-lg px-4 pt-20 pb-8 md:max-w-2xl md:pt-24 md:px-6">
        {children}
      </main>
    </div>
  );
}
