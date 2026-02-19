"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { useToast } from "@/providers/ToastProvider";
import {
  cn,
  formatPrice,
  getStoredData,
  setStoredData,
  generateId,
} from "@/lib/utils";
import { products as staticProducts } from "@/data/products";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { fadeInUp, staggerContainer } from "@/styles/animations";
import { Plus, Edit2, Package } from "lucide-react";
import type { Product } from "@/types";

export default function AdminProductsPage() {
  const { language, t } = useLanguage();
  const { addToast } = useToast();
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [stockOverrides, setStockOverrides] = useState<
    Record<string, number>
  >({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [addForm, setAddForm] = useState({
    name: "",
    brand: "",
    price: "",
    category: "hair-care",
    stockQuantity: "",
  });

  useEffect(() => {
    const storedCustom = getStoredData<Product[]>(
      "mila-products-custom",
      []
    );
    setCustomProducts(storedCustom);

    const storedOverrides = getStoredData<Record<string, number>>(
      "mila-stock-overrides",
      {}
    );
    setStockOverrides(storedOverrides);
  }, []);

  const allProducts = useMemo(() => {
    const withOverrides = staticProducts.map((p) => ({
      ...p,
      stockQuantity:
        stockOverrides[p.id] !== undefined
          ? stockOverrides[p.id]
          : p.stockQuantity,
      inStock:
        (stockOverrides[p.id] !== undefined
          ? stockOverrides[p.id]
          : p.stockQuantity) > 0,
    }));
    return [...withOverrides, ...customProducts];
  }, [customProducts, stockOverrides]);

  const stockBadgeVariant = (qty: number) => {
    if (qty === 0) return "error" as const;
    if (qty <= 10) return "warning" as const;
    return "success" as const;
  };

  const stockLabel = (qty: number) => {
    if (qty === 0) return t("admin", "outOfStock");
    return t("admin", "inStock");
  };

  const openStockEditor = (product: Product) => {
    setEditingProduct(product);
    setEditStock(product.stockQuantity);
  };

  const saveStockEdit = useCallback(() => {
    if (!editingProduct) return;

    // Check if it's a custom product
    const isCustom = customProducts.some((p) => p.id === editingProduct.id);

    if (isCustom) {
      const updated = customProducts.map((p) =>
        p.id === editingProduct.id
          ? { ...p, stockQuantity: editStock, inStock: editStock > 0 }
          : p
      );
      setCustomProducts(updated);
      setStoredData("mila-products-custom", updated);
    } else {
      const updated = { ...stockOverrides, [editingProduct.id]: editStock };
      setStockOverrides(updated);
      setStoredData("mila-stock-overrides", updated);
    }

    setEditingProduct(null);
    addToast(
      language === "es"
        ? "Stock actualizado"
        : "Stock updated",
      "success"
    );
  }, [editingProduct, editStock, customProducts, stockOverrides, addToast, language]);

  const addProduct = useCallback(() => {
    const price = parseFloat(addForm.price);
    const stockQty = parseInt(addForm.stockQuantity, 10);

    if (!addForm.name || !addForm.brand || isNaN(price) || isNaN(stockQty)) {
      addToast(
        language === "es"
          ? "Completa todos los campos"
          : "Please fill all fields",
        "error"
      );
      return;
    }

    const newProduct: Product = {
      id: `prod-custom-${generateId()}`,
      name: addForm.name,
      brand: addForm.brand,
      description: { en: "", es: "" },
      price,
      image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80",
      category: addForm.category,
      inStock: stockQty > 0,
      stockQuantity: stockQty,
      rating: 0,
      featured: false,
    };

    const updated = [...customProducts, newProduct];
    setCustomProducts(updated);
    setStoredData("mila-products-custom", updated);
    setShowAddModal(false);
    setAddForm({
      name: "",
      brand: "",
      price: "",
      category: "hair-care",
      stockQuantity: "",
    });
    addToast(
      language === "es"
        ? "Producto agregado"
        : "Product added",
      "success"
    );
  }, [addForm, customProducts, addToast, language]);

  const categoryOptions = [
    { value: "hair-care", label: language === "es" ? "Cuidado Capilar" : "Hair Care" },
    { value: "skin-care", label: language === "es" ? "Cuidado de Piel" : "Skin Care" },
    { value: "styling", label: language === "es" ? "Estilismo" : "Styling" },
    { value: "tools", label: language === "es" ? "Herramientas" : "Tools" },
    { value: "nails", label: language === "es" ? "Unas" : "Nails" },
  ];

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
        <Button size="sm" onClick={() => setShowAddModal(true)}>
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
                    className="hover:bg-mila-cream/50 transition-colors"
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
                        <span className="text-sm font-medium text-text-primary">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary hidden md:table-cell">
                      {product.brand}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary capitalize hidden lg:table-cell">
                      {product.category.replace("-", " ")}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-text-primary text-right">
                      {formatPrice(product.price)}
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
                      <button
                        onClick={() => openStockEditor(product)}
                        className="p-2 rounded-lg hover:bg-mila-cream transition-colors text-text-muted hover:text-text-primary cursor-pointer"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Edit stock modal */}
      <Modal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title={
          language === "es"
            ? "Editar Stock"
            : "Edit Stock"
        }
        size="sm"
      >
        {editingProduct && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-mila-cream/60 rounded-lg">
              <Package size={20} className="text-text-muted flex-shrink-0" />
              <div>
                <p className="font-medium text-text-primary">
                  {editingProduct.name}
                </p>
                <p className="text-sm text-text-secondary">
                  {editingProduct.brand}
                </p>
              </div>
            </div>

            <Input
              label={
                language === "es"
                  ? "Cantidad en Stock"
                  : "Stock Quantity"
              }
              type="number"
              min="0"
              value={editStock.toString()}
              onChange={(e) => setEditStock(parseInt(e.target.value, 10) || 0)}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingProduct(null)}
              >
                {t("common", "cancel")}
              </Button>
              <Button size="sm" onClick={saveStockEdit}>
                {t("common", "save")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add product modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t("admin", "addProduct")}
      >
        <div className="space-y-4">
          <Input
            label={language === "es" ? "Nombre" : "Name"}
            value={addForm.name}
            onChange={(e) =>
              setAddForm({ ...addForm, name: e.target.value })
            }
            placeholder={
              language === "es"
                ? "Nombre del producto"
                : "Product name"
            }
          />
          <Input
            label={language === "es" ? "Marca" : "Brand"}
            value={addForm.brand}
            onChange={(e) =>
              setAddForm({ ...addForm, brand: e.target.value })
            }
            placeholder="e.g. Mila Essentials"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={language === "es" ? "Precio" : "Price"}
              type="number"
              min="0"
              step="0.01"
              value={addForm.price}
              onChange={(e) =>
                setAddForm({ ...addForm, price: e.target.value })
              }
              placeholder="0.00"
            />
            <Input
              label="Stock"
              type="number"
              min="0"
              value={addForm.stockQuantity}
              onChange={(e) =>
                setAddForm({
                  ...addForm,
                  stockQuantity: e.target.value,
                })
              }
              placeholder="0"
            />
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {language === "es" ? "Categoria" : "Category"}
            </label>
            <select
              value={addForm.category}
              onChange={(e) =>
                setAddForm({ ...addForm, category: e.target.value })
              }
              className="w-full px-4 py-3 rounded-lg border border-border-default bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-mila-gold/30 focus:border-mila-gold transition-all duration-200"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddModal(false)}
            >
              {t("common", "cancel")}
            </Button>
            <Button size="sm" onClick={addProduct}>
              {t("admin", "addProduct")}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
