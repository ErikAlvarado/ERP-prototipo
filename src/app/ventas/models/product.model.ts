export interface ProductWarehouseStock {
  warehouseId: number;
  warehouse: string;
  stock: number;
  reorderPoint: number;
  criticalStock: number;
  maxStock: number;
  shelf: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  sku: string;
  price: number; // precio publico final, con impuestos incluidos
  unit: string;
  stock: number;
  discount: number; // percentage (e.g. 10 = 10% discount)
  taxRate?: number; // IVA predeterminado configurado en ventas_bd
  category: string;
  brand?: string;
  model?: string;
  image?: string;
  tracksInventory?: boolean;
  warehouseStocks?: ProductWarehouseStock[];
}
