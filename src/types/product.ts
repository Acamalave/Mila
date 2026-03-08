export interface Product {
  id: string;
  name: string;
  brand: string;
  description: { en: string; es: string };
  price: number;
  discount?: number;       // percentage discount (e.g. 20 = 20% off)
  image: string;
  category: string;
  inStock: boolean;
  stockQuantity: number;
  rating: number;
  featured: boolean;
  hidden?: boolean;         // hidden from user view
}

export interface CartItem {
  productId: string;
  quantity: number;
}
