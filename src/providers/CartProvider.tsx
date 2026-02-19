"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { CartItem } from "@/types";
import { getStoredData, setStoredData } from "@/lib/utils";
import { products } from "@/data/products";

interface CartContextValue {
  items: CartItem[];
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function persistCart(items: CartItem[]) {
  setStoredData("mila-cart", items);
}

function getProductPrice(productId: string): number {
  const product = products.find((p) => p.id === productId);
  return product ? product.price : 0;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() =>
    getStoredData<CartItem[]>("mila-cart", [])
  );

  const addItem = useCallback((productId: string) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      const next = existing
        ? prev.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...prev, { productId, quantity: 1 }];
      persistCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.productId !== productId);
      persistCart(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        const next = prev.filter((item) => item.productId !== productId);
        persistCart(next);
        return next;
      }
      const next = prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      );
      persistCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    persistCart([]);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const totalPrice = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + getProductPrice(item.productId) * item.quantity,
        0
      ),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
