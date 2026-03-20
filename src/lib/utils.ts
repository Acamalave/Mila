export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/** Formats a price range for services that have a priceMax */
export function formatServicePrice(price: number, priceMax?: number): string {
  if (priceMax && priceMax > price) {
    return `${formatPrice(price)} - ${formatPrice(priceMax)}`;
  }
  return formatPrice(price);
}

export function getStoredData<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function setStoredData<T>(key: string, data: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.code === 22)
    ) {
      console.warn(
        `[Mila] localStorage quota exceeded when saving "${key}". Data was not persisted.`
      );
    } else {
      console.warn(`[Mila] Failed to save "${key}" to localStorage:`, error);
    }
    return false;
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

const ITBMS_RATE = 0.07;

export function calculateTaxBreakdown(totalWithTax: number): {
  subtotal: number;
  taxAmount: number;
  taxRate: number;
} {
  const subtotal = Math.round((totalWithTax / (1 + ITBMS_RATE)) * 100) / 100;
  const taxAmount = Math.round((totalWithTax - subtotal) * 100) / 100;
  return { subtotal, taxAmount, taxRate: ITBMS_RATE };
}
