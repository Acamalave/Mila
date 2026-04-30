"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useBooking } from "@/providers/BookingProvider";
import { useEventBus } from "@/providers/EventBusProvider";
import { useToast } from "@/providers/ToastProvider";
import { getStoredData, generateId, calculateTaxBreakdown } from "@/lib/utils";
import { getCollection, setDocument } from "@/lib/firestore";
import { getEffectiveService } from "@/lib/service-overrides";
import type { Booking } from "@/types";
import type { ServiceDepositConfig } from "@/types/service";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SpecialistSlider from "@/components/landing/SpecialistSlider";
import ServiceSelector from "@/components/landing/ServiceSelector";
import CalendarPicker from "@/components/landing/CalendarPicker";
import PhoneLoginModal from "@/components/landing/PhoneLoginModal";
import DepositPaymentModal from "@/components/booking/DepositPaymentModal";

type DepositOverrides = Record<string, ServiceDepositConfig>;

export default function BookingPage() {
  const router = useRouter();
  const { user, isAuthenticated, hydrated } = useAuth();
  const { state, dispatch, resetBooking } = useBooking();
  const { emit } = useEventBus();
  const { addToast } = useToast();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
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

  // Finalize the booking (called after deposit payment or directly if no deposit)
  const finalizeBooking = useCallback(async (depositTxnId?: string) => {
    if (!state.selectedStylistId || !state.selectedDate || !state.selectedTimeSlot) return;

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

    if (hasConflict) {
      addToast("Este horario acaba de ser reservado. Selecciona otro.", "error");
      return;
    }

    // If a deposit was required, the booking is fully confirmed. Otherwise,
    // the booking starts as `pending` so admin can review/confirm — we no
    // longer auto-confirm a paid-in-cash booking with zero pre-charge.
    const initialStatus: Booking["status"] = depositTxnId ? "confirmed" : "pending";

    const booking: Booking = {
      id: generateId(),
      serviceIds: selectedServices,
      stylistId: state.selectedStylistId,
      clientId: user?.id ?? null,
      date: state.selectedDate,
      startTime,
      endTime,
      status: initialStatus,
      totalPrice: tax.total,
      notes: state.notes,
      createdAt: new Date().toISOString(),
      ...(depositTxnId && { depositTransactionId: depositTxnId, depositPaid: true }),
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

    resetBooking();
    router.push("/dashboard");
  }, [state, user, resetBooking, router, emit, addToast]);

  // Handle booking — check if deposit is needed
  const handleBook = useCallback(() => {
    if (!state.selectedStylistId || !state.selectedDate || !state.selectedTimeSlot) return;

    if (depositInfo.hasDeposit) {
      setShowDepositModal(true);
    } else {
      finalizeBooking();
    }
  }, [state, depositInfo, finalizeBooking]);

  // Handle deposit payment complete
  const handleDepositComplete = useCallback((txnId: string) => {
    setShowDepositModal(false);
    finalizeBooking(txnId);
  }, [finalizeBooking]);

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

      <DepositPaymentModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onPaymentComplete={handleDepositComplete}
        depositServices={depositInfo.depositServices}
        totalDeposit={depositInfo.totalDeposit}
      />
    </>
  );
}
