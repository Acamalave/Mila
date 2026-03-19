"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import type { Product } from "@/types";
import { getStoredData, setStoredData, generateId } from "@/lib/utils";
import { products as seedProducts } from "@/data/products";
import { useEventBus } from "@/providers/EventBusProvider";
import { setDocument, deleteDocument, onCollectionChange, syncArrayToDoc, onDocumentChange } from "@/lib/firestore";

interface ProductContextValue {
  allProducts: Product[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateStock: (id: string, quantity: number) => void;
}

const ProductContext = createContext<ProductContextValue | null>(null);

function mergeProducts(
  customProducts: Product[],
  stockOverrides: Record<string, number>,
  seedOverrides: Record<string, Partial<Product>>,
  deletedIds: string[]
): Product[] {
  const base = seedProducts
    .filter((p) => !deletedIds.includes(p.id))
    .map((p) => {
      let merged = { ...p };
      const overrides = seedOverrides[p.id];
      if (overrides) {
        merged = { ...merged, ...overrides };
      }
      const stockQty = stockOverrides[p.id];
      if (stockQty !== undefined) {
        merged = { ...merged, stockQuantity: stockQty, inStock: stockQty > 0 };
      }
      return merged;
    });

  const custom = customProducts.filter((p) => !deletedIds.includes(p.id));
  return [...base, ...custom];
}

export function ProductProvider({ children }: { children: ReactNode }) {
  const { emit, on } = useEventBus();

  const [customProducts, setCustomProducts] = useState<Product[]>(() =>
    getStoredData<Product[]>("mila-products-custom", [])
  );
  const [stockOverrides, setStockOverrides] = useState<Record<string, number>>(() =>
    getStoredData<Record<string, number>>("mila-stock-overrides", {})
  );
  const [seedOverrides, setSeedOverrides] = useState<Record<string, Partial<Product>>>(() =>
    getStoredData<Record<string, Partial<Product>>>("mila-products-seed-overrides", {})
  );
  const [deletedIds, setDeletedIds] = useState<string[]>(() =>
    getStoredData<string[]>("mila-products-deleted", [])
  );

  const allProducts = useMemo(
    () => mergeProducts(customProducts, stockOverrides, seedOverrides, deletedIds),
    [customProducts, stockOverrides, seedOverrides, deletedIds]
  );

  const addProduct = useCallback((data: Omit<Product, "id">) => {
    const newProduct: Product = { ...data, id: `prod-custom-${generateId()}` };
    setCustomProducts((prev) => {
      const next = [...prev, newProduct];
      setStoredData("mila-products-custom", next);
      return next;
    });
    const { id, ...productData } = newProduct;
    setDocument("products", id, productData).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    emit("product:created", newProduct);
  }, [emit]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    const isCustom = customProducts.some((p) => p.id === id);
    if (isCustom) {
      setCustomProducts((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
        setStoredData("mila-products-custom", next);
        return next;
      });
      setDocument("products", id, updates as Record<string, unknown>).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    } else {
      setSeedOverrides((prev) => {
        const existing = prev[id] ?? {};
        const next = { ...prev, [id]: { ...existing, ...updates } };
        setStoredData("mila-products-seed-overrides", next);
        setDocument("products-config", "seed-overrides", next).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
        return next;
      });
    }
    if (updates.stockQuantity !== undefined) {
      setStockOverrides((prev) => {
        const next = { ...prev, [id]: updates.stockQuantity as number };
        setStoredData("mila-stock-overrides", next);
        setDocument("products-config", "stock-overrides", next).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
        return next;
      });
    }
    emit("product:updated", { id, updates });
  }, [customProducts, emit]);

  const deleteProduct = useCallback((id: string) => {
    const isCustom = customProducts.some((p) => p.id === id);
    if (isCustom) {
      setCustomProducts((prev) => {
        const next = prev.filter((p) => p.id !== id);
        setStoredData("mila-products-custom", next);
        return next;
      });
      deleteDocument("products", id).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    } else {
      setDeletedIds((prev) => {
        const next = [...prev, id];
        setStoredData("mila-products-deleted", next);
        setDocument("products-config", "deleted", { ids: next }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
        return next;
      });
    }
    emit("product:deleted", id);
  }, [customProducts, emit]);

  const updateStock = useCallback((id: string, quantity: number) => {
    setStockOverrides((prev) => {
      const next = { ...prev, [id]: quantity };
      setStoredData("mila-stock-overrides", next);
      setDocument("products-config", "stock-overrides", next).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
      return next;
    });
    const isCustom = customProducts.some((p) => p.id === id);
    if (isCustom) {
      setCustomProducts((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, stockQuantity: quantity, inStock: quantity > 0 } : p
        );
        setStoredData("mila-products-custom", next);
        return next;
      });
      setDocument("products", id, { stockQuantity: quantity, inStock: quantity > 0 }).catch((err) => console.warn("[Mila] Firestore sync failed:", err));
    }
    emit("product:updated", { id, stockQuantity: quantity });
  }, [customProducts, emit]);

  // Firestore real-time sync
  useEffect(() => {
    const unsubs = [
      onCollectionChange<Product>("products", (firestoreProducts) => {
        if (firestoreProducts.length > 0) {
          setCustomProducts((prev) => {
            const merged = new Map<string, Product>();
            for (const p of prev) merged.set(p.id, p);
            for (const p of firestoreProducts) merged.set(p.id, p);
            const next = Array.from(merged.values());
            setStoredData("mila-products-custom", next);
            return next;
          });
        }
      }),
      onDocumentChange<Record<string, number>>("products-config", "stock-overrides", (data) => {
        if (data) {
          const overrides = { ...data } as Record<string, number>;
          delete (overrides as Record<string, unknown>)["id"];
          setStockOverrides(overrides);
          setStoredData("mila-stock-overrides", overrides);
        }
      }),
      onDocumentChange<Record<string, Partial<Product>>>("products-config", "seed-overrides", (data) => {
        if (data) {
          const overrides = { ...data } as Record<string, Partial<Product>>;
          delete (overrides as Record<string, unknown>)["id"];
          setSeedOverrides(overrides);
          setStoredData("mila-products-seed-overrides", overrides);
        }
      }),
      onDocumentChange<{ ids?: string[] }>("products-config", "deleted", (data) => {
        if (data && data.ids) {
          setDeletedIds(data.ids);
          setStoredData("mila-products-deleted", data.ids);
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    const unsubs = [
      on("product:created", () => {
        setCustomProducts(getStoredData<Product[]>("mila-products-custom", []));
      }),
      on("product:updated", () => {
        setStockOverrides(getStoredData<Record<string, number>>("mila-stock-overrides", {}));
        setSeedOverrides(getStoredData<Record<string, Partial<Product>>>("mila-products-seed-overrides", {}));
        setCustomProducts(getStoredData<Product[]>("mila-products-custom", []));
      }),
      on("product:deleted", () => {
        setCustomProducts(getStoredData<Product[]>("mila-products-custom", []));
        setDeletedIds(getStoredData<string[]>("mila-products-deleted", []));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on]);

  return (
    <ProductContext.Provider value={{ allProducts, addProduct, updateProduct, deleteProduct, updateStock }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts(): ProductContextValue {
  const context = useContext(ProductContext);
  if (!context) throw new Error("useProducts must be used within a ProductProvider");
  return context;
}
