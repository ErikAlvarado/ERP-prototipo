import { Injectable } from '@angular/core';
import { Product } from '../models/product.model';

export interface DiscountRule {
  minPrice: number;
  maxPrice: number;
  discountPercentage: number;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class DescuentoService {

  // Catálogo de reglas de descuento por escala de precio
  readonly DISCOUNT_RULES: DiscountRule[] = [
    { minPrice: 0, maxPrice: 499.99, discountPercentage: 0, description: 'Menor a $500 (0% Descuento)' },
    { minPrice: 500, maxPrice: 999.99, discountPercentage: 5, description: '$500 a $999 (5% Descuento)' },
    { minPrice: 1000, maxPrice: 2999.99, discountPercentage: 10, description: '$1000 a $2999 (10% Descuento)' },
    { minPrice: 3000, maxPrice: Infinity, discountPercentage: 15, description: 'Más de $3000 (15% Descuento)' }
  ];

  /**
   * Obtiene el porcentaje de descuento automático aplicable a un producto.
   * Si el producto trae un descuento directo predefinido mayor a 0, se respeta;
   * de lo contrario, se calcula dinámicamente según la escala de precio.
   */
  getDiscountForProduct(product: Product): number {
    if (product.discount && product.discount > 0) {
      return product.discount;
    }

    const price = product.price;
    const rule = this.DISCOUNT_RULES.find(r => price >= r.minPrice && price <= r.maxPrice);
    return rule ? rule.discountPercentage : 0;
  }
}
