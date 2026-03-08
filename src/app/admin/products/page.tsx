"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import { useProducts } from "@/providers/ProductProvider";
import { cn, formatPrice, generateId } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import {
  Plus,
  Edit2,
  Package,
  Trash2,
  Upload,
  Star,
  Eye,
  EyeOff,
  Percent,
} from "lucide-react";
import type { Product } from "@/types";

/* ── Edit / Add form state ─────────────────────────────────────── */
interface ProductFormState {
  name: string;
  brand: string;
  descriptionEn: string;
  descriptionEs: string;
  price: string;
  discount: string;
  category: string;
  stockQuantity: string;
  featured: boolean;
  hidden: boolean;
  image: string;
}

const emptyForm: ProductFormState = {
  name: "",
  brand: "",
  descriptionEn: "",
  descriptionEs: "",
  price: "",
  discount: "",
  category: "hair-care",
  stockQuantity: "",
  featured: false,
  hidden: false,
  image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80",
};

function productToForm(product: Product): ProductFormState {
  return {
    name: product.name,
    brand: product.brand,
    descriptionEn: product.description?.en ?? "",
    descriptionEs: product.description?.es ?? "",
    price: String(product.price),
    discount: product.discount ? String(product.discount) : "",
    category: product.category,
    stockQuantity: String(product.stockQuantity),
    featured: product.featured,
    hidden: product.hidden ?? false,
    image: product.image,
  };
}

export default function AdminProductsPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const { allProducts, addProduct, deleteProduct, updateProduct } = useProducts();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editingProduct;

  const stockBadgeVariant = (qty: number) => {
    if (qty === 0) return "error" as const;
    if (qty <= 10) return "warning" as const;
    return "success" as const;
  };

  const stockLabel = (qty: number) => {
    if (qty === 0) return t("admin", "outOfStock");
    return t("admin", "inStock");
  };

  /* ── Open modals ─────────────────────────────────────────────── */
  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setShowFormModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm(productToForm(product));
    setShowFormModal(true);
  };

  /* ── Image upload via FileReader ─────────────────────────────── */
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    },
    []
  );

  /* ── Save (create or update) ─────────────────────────────────── */
  const handleSave = useCallback(() => {
    const price = parseFloat(form.price);
    const stockQty = parseInt(form.stockQuantity, 10);
    const discount = form.discount ? parseInt(form.discount, 10) : undefined;

    if (!form.name || !form.brand || isNaN(price) || isNaN(stockQty)) {
      addToast(
        language === "es"
          ? "Completa todos los campos obligatorios"
          : "Please fill all required fields",
        "error"
      );
      return;
    }

    const productData: Omit<Product, "id"> = {
      name: form.name,
      brand: form.brand,
      description: { en: form.descriptionEn, es: form.descriptionEs },
      price,
      discount: discount && discount > 0 ? discount : undefined,
      image: form.image,
      category: form.category,
      inStock: stockQty > 0,
      stockQuantity: stockQty,
      rating: editingProduct?.rating ?? 0,
      featured: form.featured,
      hidden: form.hidden,
    };

    if (isEditing && editingProduct) {
      updateProduct(editingProduct.id, productData);
      addToast(
        language === "es" ? "Producto actualizado" : "Product updated",
        "success"
      );
    } else {
      addProduct(productData);
      addToast(
        language === "es" ? "Producto agregado" : "Product added",
        "success"
      );
    }

    setShowFormModal(false);
    setEditingProduct(null);
  }, [form, editingProduct, isEditing, addProduct, updateProduct, addToast, language]);

  /* ── Quick toggles ───────────────────────────────────────────── */
  const toggleFeatured = useCallback(
    (product: Product) => {
      updateProduct(product.id, { featured: !product.featured });
      addToast(
        language === "es"
          ? product.featured
            ? "Producto ya no resaltado"
            : "Producto resaltado"
          : product.featured
            ? "Product unfeatured"
            : "Product featured",
        "success"
      );
    },
    [updateProduct, addToast, language]
  );

  const toggleHidden = useCallback(
    (product: Product) => {
      updateProduct(product.id, { hidden: !product.hidden });
      addToast(
        language === "es"
          ? product.hidden
            ? "Producto visible"
            : "Producto oculto"
          : product.hidden
            ? "Product visible"
            : "Product hidden",
        "success"
      );
    },
    [updateProduct, addToast, language]
  );

  /* ── Delete ──────────────────────────────────────────────────── */
  const handleDeleteProduct = useCallback(() => {
    if (!deletingProduct) return;
    deleteProduct(deletingProduct.id);
    setDeletingProduct(null);
    addToast(
      language === "es" ? "Producto eliminado" : "Product deleted",
      "success"
    );
  }, [deletingProduct, deleteProduct, addToast, language]);

  /* ── Category options ────────────────────────────────────────── */
  const categoryOptions = [
    { value: "hair-care", label: language === "es" ? "Cuidado Capilar" : "Hair Care" },
    { value: "skin-care", label: language === "es" ? "Cuidado de Piel" : "Skin Care" },
    { value: "styling", label: language === "es" ? "Estilismo" : "Styling" },
    { value: "tools", label: language === "es" ? "Herramientas" : "Tools" },
    { value: "nails", label: language === "es" ? "Unas" : "Nails" },
  ];

  const updateForm = (field: keyof ProductFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div
        variants={fadeInUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] text-text-primary">
            {t("admin", "products")}
          </h1>
          <p className="text-text-secondary mt-1">
            {language === "es"
              ? "Inventario y gestion de productos"
              : "Inventory and product management"}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} />
          {t("admin", "addProduct")}
        </Button>
      </motion.div>

      {/* Products table */}
      <motion.div variants={fadeInUp}>
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default text-left">
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                    {language === "es" ? "Producto" : "Product"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">
                    {language === "es" ? "Marca" : "Brand"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden lg:table-cell">
                    {language === "es" ? "Categoria" : "Category"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                    {language === "es" ? "Precio" : "Price"}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                    {t("admin", "status")}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-center">
                    {language === "es" ? "Accion" : "Action"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {allProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={cn(
                      "hover:bg-mila-cream/50 transition-colors",
                      product.hidden && "opacity-50"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-mila-cream">
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-text-primary truncate">
                              {product.name}
                            </span>
                            {product.featured && (
                              <Star size={12} className="text-mila-gold fill-mila-gold flex-shrink-0" />
                            )}
                            {product.hidden && (
                              <EyeOff size={12} className="text-text-muted flex-shrink-0" />
                            )}
                          </div>
                          {product.discount && product.discount > 0 && (
                            <span className="text-xs text-red-500 font-medium">
                              -{product.discount}%
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary hidden md:table-cell">
                      {product.brand}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary capitalize hidden lg:table-cell">
                      {product.category.replace("-", " ")}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-text-primary text-right">
                      {product.discount && product.discount > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="line-through text-text-muted text-xs">
                            {formatPrice(product.price)}
                          </span>
                          <span className="text-red-500">
                            {formatPrice(product.price * (1 - product.discount / 100))}
                          </span>
                        </div>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary text-center font-mono">
                      {product.stockQuantity}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={stockBadgeVariant(product.stockQuantity)}>
                        {stockLabel(product.stockQuantity)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toggleFeatured(product)}
                          title={language === "es" ? "Resaltado" : "Featured"}
                          className={cn(
                            "p-2 rounded-lg transition-colors cursor-pointer",
                            product.featured
                              ? "bg-mila-gold/10 text-mila-gold"
                              : "text-text-muted hover:text-mila-gold hover:bg-mila-cream"
                          )}
                        >
                          <Star size={16} />
                        </button>
                        <button
                          onClick={() => toggleHidden(product)}
                          title={language === "es" ? "Visibilidad" : "Visibility"}
                          className="p-2 rounded-lg hover:bg-mila-cream transition-colors text-text-muted hover:text-text-primary cursor-pointer"
                        >
                          {product.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => openEdit(product)}
                          className="p-2 rounded-lg hover:bg-mila-cream transition-colors text-text-muted hover:text-text-primary cursor-pointer"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(product)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors text-text-muted hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* ── Product Form Modal (Create / Edit) ─────────────────── */}
      <Modal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingProduct(null);
        }}
        title={
          isEditing
            ? language === "es"
              ? "Editar Producto"
              : "Edit Product"
            : t("admin", "addProduct")
        }
        size="lg"
      >
        <div className="space-y-5">
          {/* Image upload */}
          <div className="flex items-start gap-4">
            <div
              className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 relative"
              style={{
                background: "var(--color-bg-glass)",
                border: "1px solid var(--color-border-default)",
              }}
            >
              <Image
                src={form.image}
                alt="Product"
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
            <div className="flex-1">
              <p
                className="text-sm font-medium mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {language === "es" ? "Foto del producto" : "Product photo"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} />
                {language === "es" ? "Subir foto" : "Upload photo"}
              </Button>
            </div>
          </div>

          {/* Name + Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={`${language === "es" ? "Nombre" : "Name"} *`}
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder={language === "es" ? "Nombre del producto" : "Product name"}
            />
            <Input
              label={`${language === "es" ? "Marca" : "Brand"} *`}
              value={form.brand}
              onChange={(e) => updateForm("brand", e.target.value)}
              placeholder="e.g. Mila Essentials"
            />
          </div>

          {/* Description EN + ES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="w-full">
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {language === "es" ? "Descripcion (EN)" : "Description (EN)"}
              </label>
              <textarea
                value={form.descriptionEn}
                onChange={(e) => updateForm("descriptionEn", e.target.value)}
                placeholder="Description in English"
                rows={3}
                className="w-full px-4 py-3 rounded-lg transition-all duration-200 resize-none"
                style={{
                  background: "var(--color-bg-input)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border-default)",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
            <div className="w-full">
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {language === "es" ? "Descripcion (ES)" : "Description (ES)"}
              </label>
              <textarea
                value={form.descriptionEs}
                onChange={(e) => updateForm("descriptionEs", e.target.value)}
                placeholder="Descripcion en espanol"
                rows={3}
                className="w-full px-4 py-3 rounded-lg transition-all duration-200 resize-none"
                style={{
                  background: "var(--color-bg-input)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border-default)",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Price + Discount + Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={`${language === "es" ? "Precio" : "Price"} (USD) *`}
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => updateForm("price", e.target.value)}
              placeholder="0.00"
            />
            <div className="w-full">
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span className="flex items-center gap-1">
                  <Percent size={12} />
                  {language === "es" ? "Descuento (%)" : "Discount (%)"}
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.discount}
                onChange={(e) => updateForm("discount", e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 rounded-lg transition-all duration-200"
                style={{
                  background: "var(--color-bg-input)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border-default)",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
            <Input
              label={`Stock *`}
              type="number"
              min="0"
              value={form.stockQuantity}
              onChange={(e) => updateForm("stockQuantity", e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Discount Preview */}
          {form.price && form.discount && Number(form.discount) > 0 && (
            <div
              className="flex items-center justify-between px-4 py-3 rounded-lg"
              style={{
                background: "var(--color-bg-glass)",
                border: "1px solid var(--color-border-default)",
              }}
            >
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {language === "es" ? "Precio con descuento" : "Discounted price"}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm line-through" style={{ color: "var(--color-text-muted)" }}>
                  {formatPrice(Number(form.price))}
                </span>
                <span className="text-lg font-semibold" style={{ color: "#ef4444" }}>
                  {formatPrice(Number(form.price) * (1 - Number(form.discount) / 100))}
                </span>
              </div>
            </div>
          )}

          {/* Category */}
          <div className="w-full">
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {language === "es" ? "Categoria" : "Category"}
            </label>
            <select
              value={form.category}
              onChange={(e) => updateForm("category", e.target.value)}
              className="w-full px-4 py-3 rounded-lg transition-all duration-200"
              style={{
                background: "var(--color-bg-input)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-default)",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-glow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles: Featured + Hidden */}
          <div className="flex flex-wrap gap-4">
            <label
              className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer select-none"
              style={{
                background: form.featured ? "var(--color-accent-subtle)" : "var(--color-bg-glass)",
                border: form.featured
                  ? "1px solid var(--color-border-accent)"
                  : "1px solid var(--color-border-default)",
                transition: "all 0.2s ease",
              }}
            >
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => updateForm("featured", e.target.checked)}
                className="sr-only"
              />
              <Star
                size={18}
                className={form.featured ? "text-mila-gold fill-mila-gold" : "text-text-muted"}
              />
              <span
                className="text-sm font-medium"
                style={{ color: form.featured ? "var(--color-accent)" : "var(--color-text-secondary)" }}
              >
                {language === "es" ? "Resaltado" : "Featured"}
              </span>
            </label>

            <label
              className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer select-none"
              style={{
                background: form.hidden ? "rgba(239,68,68,0.08)" : "var(--color-bg-glass)",
                border: form.hidden
                  ? "1px solid rgba(239,68,68,0.3)"
                  : "1px solid var(--color-border-default)",
                transition: "all 0.2s ease",
              }}
            >
              <input
                type="checkbox"
                checked={form.hidden}
                onChange={(e) => updateForm("hidden", e.target.checked)}
                className="sr-only"
              />
              {form.hidden ? (
                <EyeOff size={18} className="text-red-500" />
              ) : (
                <Eye size={18} className="text-text-muted" />
              )}
              <span
                className="text-sm font-medium"
                style={{ color: form.hidden ? "#ef4444" : "var(--color-text-secondary)" }}
              >
                {language === "es" ? "Oculto al usuario" : "Hidden from user"}
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div
            className="flex justify-end gap-3 pt-4"
            style={{ borderTop: "1px solid var(--color-border-default)" }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowFormModal(false);
                setEditingProduct(null);
              }}
            >
              {t("common", "cancel")}
            </Button>
            <Button size="sm" onClick={handleSave}>
              {t("common", "save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProduct}
        title={t("admin", "deleteProduct")}
        message={t("admin", "confirmDeleteProduct")}
        itemName={deletingProduct?.name ?? ""}
      />
    </motion.div>
  );
}
