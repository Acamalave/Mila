"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useBooking } from "@/providers/BookingProvider";
import { useEventBus } from "@/providers/EventBusProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useStaff } from "@/providers/StaffProvider";
import { useToast } from "@/providers/ToastProvider";
import { getStoredData, generateId, calculateTaxBreakdown } from "@/lib/utils";
import { getCollection, setDocument } from "@/lib/firestore";
import { getEffectiveService } from "@/lib/service-overrides";
import { useInvoices } from "@/providers/InvoiceProvider";
import type { Booking, Invoice } from "@/types";
import type { ServiceDepositConfig } from "@/types/service";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SpecialistSlider from "@/components/landing/SpecialistSlider";
import ServiceSelector from "@/components/landing/ServiceSelector";
import CalendarPicker from "@/components/landing/CalendarPicker";
import PhoneLoginModal from "@/components/landing/PhoneLoginModal";

type DepositOverrides = Record<string, ServiceDepositConfig>;

export default function BookingPage() {
  const router = useRouter();
  const { user, isAuthenticated, hydrated } = useAuth();
  const { state, dispatch, resetBooking } = useBooking();
  const { emit } = useEventBus();
  const { language } = useLanguage();
  const { allStylists } = useStaff();
  const { addToast } = useToast();
  const { addInvoice } = useInvoices();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingBook, setPendingBook] = useState(false);

  const servicesRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Load deposit overrides
  const depositOverrides = useMemo<DepositOverrides>(
    () => getStoredData<DepositOverrides>("mila-service-deposit-overrides", {}),
    []
  );

  // Calculate deposit info for selected services (uses admin-overridden prices)
  const depositInfo = useMemo(() => {
    if (state.isGeneralAppointment || state.selectedServiceIds.length === 0) {
      return { hasDeposit: false, depositServices: [], totalDeposit: 0 };
    }

    const depositServices = state.selectedServiceIds
      .map((sId) => {
        const svc = getEffectiveService(sId);
        const config = depositOverrides[sId];
        if (!svc || !config?.requiresDeposit) return null;
        const depositAmount = config.depositType === "percentage"
          ? Math.round(svc.price * config.depositAmount / 100)
          : config.depositAmount;
        return {
          id: svc.id,
          name: svc.name.es,
          price: svc.price,
          deposit: config,
          depositAmount,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        name: string;
        price: number;
        deposit: ServiceDepositConfig;
        depositAmount: number;
      }>;

    return {
      hasDeposit: depositServices.length > 0,
      depositServices,
      totalDeposit: depositServices.reduce((sum, s) => sum + s.depositAmount, 0),
    };
  }, [state.selectedServiceIds, state.isGeneralAppointment, depositOverrides]);

  const scrollToSection = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleSpecialistSelect = useCallback(() => {
    dispatch({ type: "GO_TO_STEP", payload: 2 });
    scrollToSection(servicesRef);
  }, [dispatch, scrollToSection]);

  const handleServicesContinue = useCallback(() => {
    dispatch({ type: "GO_TO_STEP", payload: 3 });
    scrollToSection(calendarRef);
  }, [dispatch, scrollToSection]);

  // Returns true if the given stylist already has an overlapping booking.
  const hasSlotConflict = useCallback(
    (stylistId: string, date: string, startTime: string, endTime: string) => {
      const existing = getStoredData<Booking[]>("mila-bookings", []);
      return existing.some(
        (b) =>
          b.stylistId === stylistId &&
          b.date === date &&
          (b.status === "confirmed" || b.status === "pending") &&
          startTime < b.endTime &&
          endTime > b.startTime
      );
    },
    []
  );

  // Build + persist the booking from the current flow state and return it.
  // Returns null if a slot conflict aborts creation. Does NOT navigate or
  // reset — the caller decides what happens next (go to dashboard, or redirect
  // to the deposit checkout).
  const persistBookingFromState = useCallback(
    async (status: Booking["status"]): Promise<Booking | null> => {
      if (!state.selectedStylistId || !state.selectedDate || !state.selectedTimeSlot) return null;

      const selectedServices = state.isGeneralAppointment ? [] : state.selectedServiceIds;
      // Use admin-overridden prices so what the client pays matches what the
      // admin configured in /admin/services.
      const subtotal = selectedServices.reduce((sum, sId) => {
        return sum + (getEffectiveService(sId)?.price ?? 0);
      }, 0);
      const tax = calculateTaxBreakdown(subtotal, 0);

      // Cross-device conflict check: pull current bookings from Firestore so two
      // clients on different devices can't grab the same slot at the same time.
      let firestoreBookings: Booking[] = [];
      try {
        firestoreBookings = await getCollection<Booking>("bookings");
      } catch {
        // Firestore unavailable — fall back to local-only check
        firestoreBookings = getStoredData<Booking[]>("mila-bookings", []);
      }

      const startTime = state.selectedTimeSlot.startTime;
      const endTime = state.selectedTimeSlot.endTime;
      const hasConflict = firestoreBookings.some(
        (b) =>
          b.stylistId === state.selectedStylistId &&
          b.date === state.selectedDate &&
          (b.status === "confirmed" || b.status === "pending") &&
          startTime < b.endTime &&
          endTime > b.startTime
      );

      // Abort before creating anything / charging any deposit.
      if (hasConflict) {
        addToast(
          language === "es"
            ? "Este horario acaba de ser reservado. Selecciona otro."
            : "This time slot was just booked. Please pick another.",
          "error"
        );
        return null;
      }

      const booking: Booking = {
        id: generateId(),
        serviceIds: selectedServices,
        stylistId: state.selectedStylistId,
        stylistName: allStylists.find((s) => s.id === state.selectedStylistId)?.name,
        clientId: user?.id ?? null,
        clientName: user?.name,
        date: state.selectedDate,
        startTime,
        endTime,
        status,
        totalPrice: tax.total,
        notes: state.notes,
        createdAt: new Date().toISOString(),
      };

      const { id, ...bookingData } = booking;
      // Include tax breakdown so analytics + dashboard reconcile against invoices
      const enrichedBookingData = {
        ...bookingData,
        subtotal: tax.subtotal,
        taxAmount: tax.taxAmount,
        taxRate: tax.taxRate,
      };
      setDocument("bookings", id, enrichedBookingData).catch((err) => console.warn("[Mila] Booking sync failed:", err));
      emit("booking:updated", booking);
      return booking;
    },
    [state, user, allStylists, emit, addToast, language]
  );

  // No-deposit path: create the booking as `pending` (admin reviews/confirms)
  // and send the client to their dashboard.
  const finalizeBooking = useCallback(async () => {
    const booking = await persistBookingFromState("pending");
    if (!booking) return;
    resetBooking();
    router.push("/dashboard");
  }, [persistBookingFromState, resetBooking, router]);

  // Deposit path: create the booking as `pending` (slot held) plus a deposit
  // invoice, then redirect to the hosted Paguelo Facil checkout (/pay) where
  // the 3D Secure challenge happens. The webhook confirms the booking once the
  // deposit invoice is paid.
  const startDepositPayment = useCallback(async () => {
    const booking = await persistBookingFromState("pending");
    if (!booking) return;

    const depositInvoice = addInvoice({
      clientId: user?.id ?? "",
      clientName: user?.name ?? "Cliente",
      amount: depositInfo.totalDeposit,
      bookingId: booking.id,
      isDeposit: true,
      stylistId: booking.stylistId,
      status: "sent",
      date: new Date().toISOString().split("T")[0],
      description: {
        es: "Anticipo de reserva — Mila Concept",
        en: "Booking deposit — Mila Concept",
      },
    } as Omit<Invoice, "id" | "createdAt">);

    resetBooking();
    window.location.href = `/pay?invoice=${encodeURIComponent(depositInvoice.id)}`;
  }, [persistBookingFromState, addInvoice, user, depositInfo, resetBooking]);

  // Handle booking — check if deposit is needed
  const handleBook = useCallback(() => {
    if (!state.selectedStylistId || !state.selectedDate || !state.selectedTimeSlot) return;

    // Verify the slot is still free BEFORE charging any deposit, so a customer
    // is never charged for a slot that was taken during checkout.
    if (
      hasSlotConflict(
        state.selectedStylistId,
        state.selectedDate,
        state.selectedTimeSlot.startTime,
        state.selectedTimeSlot.endTime
      )
    ) {
      addToast(
        language === "es"
          ? "Este horario acaba de ser reservado. Selecciona otro."
          : "This time slot was just booked. Please pick another.",
        "error"
      );
      return;
    }

    if (depositInfo.hasDeposit) {
      startDepositPayment();
    } else {
      finalizeBooking();
    }
  }, [state, depositInfo, finalizeBooking, startDepositPayment, hasSlotConflict, addToast, language]);

  const handleLoginRequired = useCallback(() => {
    setPendingBook(true);
    setShowLoginModal(true);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  useEffect(() => {
    if (pendingBook && user?.id) {
      setPendingBook(false);
      handleBook();
    }
  }, [pendingBook, user, handleBook]);

  if (!hydrated) return null;

  const showServices = state.selectedStylistId !== null;
  const showCalendar = showServices && (state.selectedServiceIds.length > 0 || state.isGeneralAppointment);

  return (
    <>
      <Header />

      <main className="relative" style={{ background: "var(--color-bg-page)", minHeight: "100vh" }}>
        <SpecialistSlider onSelect={handleSpecialistSelect} />

        <AnimatePresence>
          {showServices && state.selectedStylistId && (
            <motion.div
              ref={servicesRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <ServiceSelector
                stylistId={state.selectedStylistId}
                onContinue={handleServicesContinue}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCalendar && (
            <motion.div
              ref={calendarRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <CalendarPicker
                onBook={handleBook}
                onLoginRequired={handleLoginRequired}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      <PhoneLoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingBook(false);
        }}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
}
