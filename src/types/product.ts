export interface Product {
  id: string;
  name: string;
  brand: string;
  description: { en: string; es: string };
  price: number;
  image: string;
  category: string;
  inStock: boolean;
  stockQuantity: number;
  rating: number;
  featured: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
}
