"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/providers/ToastProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { CartProvider } from "@/providers/CartProvider";
import { BookingProvider } from "@/providers/BookingProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <LanguageProvider>
        <AuthProvider>
          <BookingProvider>
            <CartProvider>{children}</CartProvider>
          </BookingProvider>
        </AuthProvider>
      </LanguageProvider>
    </ToastProvider>
  );
}
