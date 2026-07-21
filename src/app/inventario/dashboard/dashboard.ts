import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../shared/imports/shared-imports';

@Component({
  selector: 'app-dashboard',
  imports: [...SHARED_IMPORTS,],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  summaryCards = [
    {
      title: 'Productos en catalogo',
      value: '6',
      detail: '95 unidades totales',
      icon: 'inventory',
      tone: 'primary',
    },
    {
      title: 'Stock crítico',
      value: '2',
      detail: 'Requieren atención inmediata',
      icon: 'warning',
      tone: 'warn',
    },
    {
      title: 'Valor de inventario',
      value: '$23,540',
      detail: 'Precio costo',
      icon: 'attach_money',
      tone: 'accent',
    },
    {
      title: 'Kits activos',
      value: '9',
      detail: '7 referencias',
      icon: 'sell',
      tone: 'primary',
    },
  ];

  quickActions = [
    { label: 'Gestionar productos', icon: 'add_box', route: '/products' },
    { label: 'Registrar ajuste', icon: 'move_to_inbox', route: '/ajustes' },
    { label: 'Generar reporte', icon: 'bar_chart', route: '/compras/consultas' },
  ];

  topProducts = [
    { name: 'Cable HDMI 2m', stock: 42, sales: 128, status: 'Disponible' },
    { name: 'Mouse inalambrico', stock: 18, sales: 94, status: 'Medio' },
    { name: 'Teclado mecanico', stock: 7, sales: 76, status: 'Bajo' },
    { name: 'Adaptador USB-C', stock: 5, sales: 61, status: 'Bajo' },
  ];

  activities = [
    { title: 'Venta cerrada', detail: 'Ticket #1028 - $1,240', icon: 'check_circle' },
    { title: 'Stock actualizado', detail: 'Cable HDMI 2m +20 piezas', icon: 'sync' },
    { title: 'Producto por agotarse', detail: 'Adaptador USB-C queda en 5', icon: 'warning' },
  ];
}


