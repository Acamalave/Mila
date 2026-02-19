"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useBooking } from "@/providers/BookingProvider";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import type { Booking } from "@/types";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SpecialistSlider from "@/components/landing/SpecialistSlider";
import ServiceSelector from "@/components/landing/ServiceSelector";
import CalendarPicker from "@/components/landing/CalendarPicker";
import BookingSuccess from "@/components/landing/BookingSuccess";
import PhoneLoginModal from "@/components/landing/PhoneLoginModal";

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, hydrated } = useAuth();
  const { state, dispatch, resetBooking } = useBooking();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingBook, setPendingBook] = useState(false);

  const servicesRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (hydrated && isAuthenticated) {
      // Check if user has come here intentionally (e.g., to book another)
      // Only redirect on initial load, not after booking
      const hasBookingInProgress = state.selectedStylistId !== null;
      if (!hasBookingInProgress && !showSuccess) {
        router.push("/dashboard");
      }
    }
  }, [hydrated, isAuthenticated, router, state.selectedStylistId, showSuccess]);

  // Smooth scroll to section
  const scrollToSection = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  // When specialist is selected, show services and scroll
  const handleSpecialistSelect = useCallback(() => {
    dispatch({ type: "GO_TO_STEP", payload: 2 });
    scrollToSection(servicesRef);
  }, [dispatch, scrollToSection]);

  // When services are confirmed, show calendar and scroll
  const handleServicesContinue = useCallback(() => {
    dispatch({ type: "GO_TO_STEP", payload: 3 });
    scrollToSection(calendarRef);
  }, [dispatch, scrollToSection]);

  // Handle booking confirmation
  const handleBook = useCallback(() => {
    // Create the booking
    const booking: Booking = {
      id: generateId(),
      serviceIds: state.isGeneralAppointment ? [] : state.selectedServiceIds,
      stylistId: state.selectedStylistId!,
      clientId: user?.id ?? null,
      date: state.selectedDate!,
      startTime: state.selectedTimeSlot!.startTime,
      endTime: state.selectedTimeSlot!.endTime,
      status: "confirmed",
      totalPrice: 0, // Will be calculated
      notes: state.notes,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    const existing = getStoredData<Booking[]>("mila-bookings", []);
    setStoredData("mila-bookings", [...existing, booking]);

    // Show success
    dispatch({ type: "GO_TO_STEP", payload: 4 });
    setShowSuccess(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state, user, dispatch]);

  // Handle login required during booking
  const handleLoginRequired = useCallback(() => {
    setPendingBook(true);
    setShowLoginModal(true);
  }, []);

  // After successful login, proceed with booking
  const handleLoginSuccess = useCallback(() => {
    setShowLoginModal(false);
    if (pendingBook) {
      setPendingBook(false);
      // Short delay to let auth state update
      setTimeout(() => handleBook(), 100);
    }
  }, [pendingBook, handleBook]);

  // Go to dashboard after booking
  const handleGoToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  // Book another appointment
  const handleBookAnother = useCallback(() => {
    resetBooking();
    setShowSuccess(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [resetBooking]);

  // Don't render until hydrated
  if (!hydrated) return null;

  // Show success screen
  if (showSuccess) {
    return (
      <>
        <Header />
        <BookingSuccess
          onGoToDashboard={handleGoToDashboard}
          onBookAnother={handleBookAnother}
        />
      </>
    );
  }

  const showServices = state.selectedStylistId !== null;
  const showCalendar = showServices && (state.selectedServiceIds.length > 0 || state.isGeneralAppointment);

  return (
    <>
      <Header />

      <main style={{ paddingTop: 64 }}>
        {/* Hero Mini - Logo + Tagline */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center py-10 sm:py-16 px-4"
          style={{
            background: "linear-gradient(180deg, #110D09 0%, #1A1614 60%, #FAF8F5 100%)",
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-3xl sm:text-5xl font-bold tracking-wider"
            style={{
              fontFamily: "var(--font-display)",
              color: "#FAF8F5",
              letterSpacing: "0.15em",
            }}
          >
            MILA CONCEPT
          </motion.h1>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: 60,
              height: 2,
              background: "linear-gradient(90deg, #8E7B54, #C4A96A)",
              margin: "12px auto",
              borderRadius: 2,
            }}
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-sm sm:text-base"
            style={{
              color: "#ABA595",
              letterSpacing: "0.3em",
              textTransform: "uppercase" as const,
              fontFamily: "var(--font-accent)",
              fontWeight: 300,
            }}
          >
            Where Art Meets Beauty
          </motion.p>
        </motion.section>

        {/* Step 1: Specialist Selection */}
        <SpecialistSlider onSelect={handleSpecialistSelect} />

        {/* Step 2: Service Selection */}
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

        {/* Step 3: Calendar & Time */}
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

      {/* Phone Login Modal */}
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
