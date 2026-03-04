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
  deletedIds: string[]
): Product[] {
  const base = seedProducts
    .filter((p) => !deletedIds.includes(p.id))
    .map((p) => {
      const stockQty = stockOverrides[p.id];
      if (stockQty !== undefined) {
        return { ...p, stockQuantity: stockQty, inStock: stockQty > 0 };
      }
      return p;
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
  const [deletedIds, setDeletedIds] = useState<string[]>(() =>
    getStoredData<string[]>("mila-products-deleted", [])
  );

  const allProducts = useMemo(
    () => mergeProducts(customProducts, stockOverrides, deletedIds),
    [customProducts, stockOverrides, deletedIds]
  );

  const addProduct = useCallback((data: Omit<Product, "id">) => {
    const newProduct: Product = { ...data, id: `prod-custom-${generateId()}` };
    setCustomProducts((prev) => {
      const next = [...prev, newProduct];
      setStoredData("mila-products-custom", next);
      return next;
    });
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
    }
    if (updates.stockQuantity !== undefined) {
      setStockOverrides((prev) => {
        const next = { ...prev, [id]: updates.stockQuantity as number };
        setStoredData("mila-stock-overrides", next);
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
    } else {
      setDeletedIds((prev) => {
        const next = [...prev, id];
        setStoredData("mila-products-deleted", next);
        return next;
      });
    }
    emit("product:deleted", id);
  }, [customProducts, emit]);

  const updateStock = useCallback((id: string, quantity: number) => {
    setStockOverrides((prev) => {
      const next = { ...prev, [id]: quantity };
      setStoredData("mila-stock-overrides", next);
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
    }
    emit("product:updated", { id, stockQuantity: quantity });
  }, [customProducts, emit]);

  useEffect(() => {
    const unsubs = [
      on("product:created", () => {
        setCustomProducts(getStoredData<Product[]>("mila-products-custom", []));
      }),
      on("product:updated", () => {
        setStockOverrides(getStoredData<Record<string, number>>("mila-stock-overrides", {}));
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
