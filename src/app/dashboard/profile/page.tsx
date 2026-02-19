"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { setStoredData } from "@/lib/utils";
import type { User } from "@/types";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { UserCircle } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { addToast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!user) return;

    const updatedUser: User = {
      ...user,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
    };

    setStoredData("mila-auth", updatedUser);

    addToast(
      language === "es"
        ? "Perfil actualizado"
        : "Profile updated successfully",
      "success"
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-2xl"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center gap-3">
        <UserCircle size={24} className="text-mila-gold" />
        <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("dashboard", "profile")}
        </h1>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card>
          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <Avatar
              src={user?.avatar}
              alt={user?.name ?? "User"}
              size="xl"
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t("auth", "name")}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sofia Chen"
            />

            <Input
              label={t("auth", "phone")}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="555 300 4000"
            />

            <Input
              label={language === "es" ? "Email (opcional)" : "Email (optional)"}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <div className="pt-2">
              <Button type="submit" fullWidth>
                {t("dashboard", "updateProfile")}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
