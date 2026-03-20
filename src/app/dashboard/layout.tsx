"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

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
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg-page)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{
              borderColor: "var(--color-border-default)",
              borderTopColor: "var(--color-accent)",
            }}
          />
          <p
            className="text-sm"
            style={{
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: 11,
            }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: "var(--color-bg-page)" }}
    >
      {/* Animated gradient blobs for liquid glass effect */}
      <div
        className="fixed pointer-events-none animate-blob-1"
        style={{
          top: "10%",
          left: "10%",
          width: "50vw",
          height: "50vw",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 50%, var(--blob-color-1) 0%, transparent 70%)",
          filter: "blur(40px)",
          opacity: 0.8,
        }}
      />
      <div
        className="fixed pointer-events-none animate-blob-2"
        style={{
          top: "60%",
          right: "5%",
          width: "40vw",
          height: "40vw",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 50%, var(--blob-color-2) 0%, transparent 70%)",
          filter: "blur(40px)",
          opacity: 0.8,
        }}
      />
      <div
        className="fixed pointer-events-none animate-blob-3"
        style={{
          top: "70%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "60vw",
          height: "60vw",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 50%, var(--blob-color-3) 0%, transparent 70%)",
          filter: "blur(40px)",
          opacity: 0.6,
        }}
      />

      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="relative z-10 mx-auto w-full max-w-lg px-4 pt-24 pb-8 md:max-w-2xl md:pt-28 md:px-6">
        {children}
      </main>

      {/* Footer */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
