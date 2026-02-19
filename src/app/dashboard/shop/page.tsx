"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useCart } from "@/providers/CartProvider";
import { useToast } from "@/providers/ToastProvider";
import { formatPrice, cn } from "@/lib/utils";
import { products } from "@/data/products";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StarRating from "@/components/ui/StarRating";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
} from "lucide-react";

const CATEGORIES = [
  { value: "all", labelEn: "All", labelEs: "Todos" },
  { value: "hair-care", labelEn: "Hair Care", labelEs: "Cabello" },
  { value: "skin-care", labelEn: "Skin Care", labelEs: "Piel" },
  { value: "styling", labelEn: "Styling", labelEs: "Estilizado" },
  { value: "tools", labelEn: "Tools", labelEs: "Herramientas" },
];

export default function ShopPage() {
  const { language, t } = useLanguage();
  const { items, addItem, removeItem, updateQuantity, totalItems, totalPrice } = useCart();
  const { addToast } = useToast();
  const [activeCategory, setActiveCategory] = useState("all");
  const [cartOpen, setCartOpen] = useState(false);

  const filtered =
    activeCategory === "all"
      ? products
      : products.filter((p) => p.category === activeCategory);

  function handleAddToCart(productId: string) {
    addItem(productId);
    addToast(
      language === "es" ? "Agregado al carrito" : "Added to cart",
      "success"
    );
  }

  function getCartProduct(productId: string) {
    return products.find((p) => p.id === productId);
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-24"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-center gap-3">
        <ShoppingBag size={24} className="text-mila-gold" />
        <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] text-text-primary">
          {t("dashboard", "shop")}
        </h1>
      </motion.div>

      {/* Category tabs */}
      <motion.div variants={fadeInUp} className="flex overflow-x-auto gap-2 pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
              activeCategory === cat.value
                ? "bg-mila-gold text-white"
                : "bg-mila-cream text-text-secondary hover:bg-mila-gold/10 hover:text-mila-gold"
            )}
          >
            {language === "es" ? cat.labelEs : cat.labelEn}
          </button>
        ))}
      </motion.div>

      {/* Product grid */}
      <motion.div
        variants={staggerContainer}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {filtered.map((product, i) => (
          <motion.div
            key={product.id}
            variants={fadeInUp}
            custom={i}
          >
            <Card padding="none" hover className="overflow-hidden h-full flex flex-col">
              {/* Image */}
              <div className="relative aspect-square bg-mila-cream">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>

              {/* Info */}
              <div className="p-4 flex-1 flex flex-col">
                <p className="text-xs text-text-muted uppercase tracking-wider">
                  {product.brand}
                </p>
                <p className="font-semibold text-sm text-text-primary mt-1 line-clamp-2 flex-1">
                  {product.name}
                </p>
                <StarRating rating={product.rating} size={12} className="mt-2" />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-lg font-bold text-mila-gold">
                    {formatPrice(product.price)}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(product.id)}
                    className="!px-3 !py-1.5"
                  >
                    <Plus size={14} />
                    <span className="hidden sm:inline text-xs">
                      {t("dashboard", "addToCart")}
                    </span>
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Floating cart bar */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-40 p-4"
          >
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => setCartOpen(true)}
                className="w-full bg-mila-espresso text-white rounded-xl px-6 py-4 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.15)] hover:bg-mila-charcoal transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingCart size={20} />
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-mila-gold rounded-full text-xs flex items-center justify-center font-bold">
                      {totalItems}
                    </span>
                  </div>
                  <span className="font-medium">
                    {t("dashboard", "cart")}
                  </span>
                </div>
                <span className="font-bold text-lg">
                  {formatPrice(totalPrice)}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart modal */}
      <Modal
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        title={t("dashboard", "cart")}
        size="lg"
      >
        {items.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart size={40} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">{t("dashboard", "emptyCart")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const product = getCartProduct(item.productId);
              if (!product) return null;

              return (
                <div
                  key={item.productId}
                  className="flex items-center gap-4 py-3 border-b border-border-default last:border-0"
                >
                  {/* Image */}
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-mila-cream flex-shrink-0">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-text-primary truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-mila-gold font-semibold">
                      {formatPrice(product.price)}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                      className="w-8 h-8 rounded-lg border border-border-default flex items-center justify-center hover:bg-mila-cream transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity + 1)
                      }
                      className="w-8 h-8 rounded-lg border border-border-default flex items-center justify-center hover:bg-mila-cream transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-2 text-text-muted hover:text-error transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}

            {/* Total and checkout */}
            <div className="pt-4 border-t border-border-default">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-text-primary">Total</span>
                <span className="text-xl font-bold text-mila-gold">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  addToast(
                    language === "es"
                      ? "Pedido procesado con exito"
                      : "Order processed successfully",
                    "success"
                  );
                  setCartOpen(false);
                }}
              >
                {t("dashboard", "checkout")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
