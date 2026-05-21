"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn } from "@/lib/utils";
import AccountingOverview from "@/components/accounting/AccountingOverview";
import ExpensesManager from "@/components/accounting/ExpensesManager";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { Wallet, Receipt } from "lucide-react";

type View = "overview" | "expenses";

export default function AdminAccountingPage() {
  const { language } = useLanguage();
  const [view, setView] = useState<View>("overview");

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* View toggle — same pattern as /admin/billing so admins recognise it */}
      <motion.div variants={fadeInUp} className="flex items-center gap-2">
        <button
          onClick={() => setView("overview")}
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
            view === "overview"
              ? "bg-mila-gold/15 text-mila-gold"
              : "text-text-muted hover:text-text-primary hover:bg-white/5"
          )}
        >
          <span className="flex items-center gap-2">
            <Wallet size={16} />
            {language === "es" ? "Resumen" : "Overview"}
          </span>
        </button>
        <button
          onClick={() => setView("expenses")}
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
            view === "expenses"
              ? "bg-mila-gold/15 text-mila-gold"
              : "text-text-muted hover:text-text-primary hover:bg-white/5"
          )}
        >
          <span className="flex items-center gap-2">
            <Receipt size={16} />
            {language === "es" ? "Gastos" : "Expenses"}
          </span>
        </button>
      </motion.div>

      {/* Body — same components the accountant role mounts, so the data and
          calculations are identical. No duplication. */}
      {view === "overview" ? <AccountingOverview /> : <ExpensesManager />}
    </motion.div>
  );
}
