export interface Product {
  id: string;
  code: string;
  name: string;
  sku: string;
  price: number;
  unit: string;
  stock: number;
  discount: number; // percentage (e.g. 10 = 10% discount)
  category: string;
  brand?: string;
  model?: string;
  image?: string;
}
