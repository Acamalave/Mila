"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { EventBusProvider } from "@/providers/EventBusProvider";
import { StaffProvider } from "@/providers/StaffProvider";
import { ProductProvider } from "@/providers/ProductProvider";
import { BookingProvider } from "@/providers/BookingProvider";
import { InvoiceProvider } from "@/providers/InvoiceProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { PaymentProvider } from "@/providers/PaymentProvider";
import { CartProvider } from "@/providers/CartProvider";
import { CommissionProvider } from "@/providers/CommissionProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <LanguageProvider>
          <AuthProvider>
            <EventBusProvider>
              <StaffProvider>
                <ProductProvider>
                  <BookingProvider>
                    <CommissionProvider>
                      <InvoiceProvider>
                        <NotificationProvider>
                          <PaymentProvider>
                            <CartProvider>{children}</CartProvider>
                          </PaymentProvider>
                        </NotificationProvider>
                      </InvoiceProvider>
                    </CommissionProvider>
                  </BookingProvider>
                </ProductProvider>
              </StaffProvider>
            </EventBusProvider>
          </AuthProvider>
        </LanguageProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
