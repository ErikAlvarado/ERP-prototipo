import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../shared/imports/shared-imports';

@Component({
  selector: 'app-dashboard',
  imports: [...SHARED_IMPORTS],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  // Tarjeta 1: Stock de Productos
  stockProducts = [
    { name: 'Cinta métrica Truper', stock: 50, img: 'assets/cinta.png' },
    { name: 'Aerosol WD-40', stock: 594, img: 'assets/wd40.png' },
    { name: 'Plafón Redondo', stock: 199, img: 'assets/plafon.png' },
    { name: 'Martillo Truper', stock: 7, img: 'assets/martillo.png' },
  ];

  // Tarjeta 2: Entradas y Salidas del Día
  recentMovements = [
    { name: 'Cinta métrica Truper', type: 'Entrada', qty: '+20' },
    { name: 'Martillo Truper', type: 'Salida', qty: '-5' },
  ];

  // Tarjeta 3: Resumen / Salud del Inventario (en vez de solo finanzas)
  inventoryValue = {
    totalValue: '$98,076',
    totalCost: '$44,933',
    margin: '$53,143',
  };

  // Tarjeta 4: Productos por Reponer (Con días reales y alertas por color)
  reorderProducts = [
    { name: 'Martillo Truper', duration: '3 días', tone: 'danger', img: 'assets/martillo.png' },
    { name: 'Cinta métrica Truper', duration: '12 días', tone: 'warning', img: 'assets/cinta.png' },
    { name: 'Plafón Redondo', duration: '28 días', tone: 'normal', img: 'assets/plafon.png' },
    { name: 'Aerosol WD-40', duration: '+1 mes', tone: 'normal', img: 'assets/wd40.png' },
  ];

  // Tarjeta 5: Productos Pronto a Expirar
  expiringProducts: Array<{ name: string; expiration: string; img: string }> = [
    // Déjalo vacío [] para probar el estado "Sin alertas"
  ];

  // Tarjeta 6: Productos Apartados
  reservedProducts: Array<{ name: string; reservedQty: number; img: string }> = [
    // Déjalo vacío [] para probar el estado "Sin apartados"
  ];
}