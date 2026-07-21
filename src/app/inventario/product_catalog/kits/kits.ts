import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatDialog } from '@angular/material/dialog';
import { KitsDialog } from './dialogs/kits-dialog/kits-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';



export interface Kit {
  nombre: string;
  descripcion: string;
  precio: number;
  costo: number;
  margen: number;
  elementos: string[];
  fecha: string;
  estado: boolean;
}

export const MOCK_KITS: Kit[] = [
  {
    nombre: 'Kit 1',
    descripcion: 'Producto 1 + Producto 2 + Producto 3',
    precio: 850,
    costo: 580,
    margen: 32,
    elementos: ['Producto 1', 'Producto 2', 'Producto 3'],
    fecha: '2026-05-01',
    estado: true
  },
  {
    nombre: 'Kit 2',
    descripcion: 'Descripcion de kit',
    precio: 1100,
    costo: 720,
    margen: 35,
    elementos: ['Producto 2', 'Producto 3'],
    fecha: '2026-05-15',
    estado: false
  },
  {
    nombre: 'Pack ',
    descripcion: 'Producto 1 + Producto 2 + Producto 3',
    precio: 1450,
    costo: 960,
    margen: 34,
    elementos: ['Producto 1', 'Producto 2'],
    fecha: '2026-06-01',
    estado: true
  }
];

@Component({
  selector: 'app-kits',
  imports: [SHARED_IMPORTS],
  templateUrl: './kits.html',
  styleUrl: './kits.css',
})
export class Kits {
  constructor(private dialog: MatDialog) {}
  kits = MOCK_KITS;

  abrirDialogo() {
    this.dialog.open(KitsDialog, {
      width: '700px',
      data: { mode: 'add' }
    }).afterClosed().subscribe(result => {
      if (!result) return;
      this.kits = [...this.kits, result];
    });
  }

  editar(kit: Kit) {
    this.dialog.open(KitsDialog, {
      width: '700px',
      data: {
        mode: 'edit',
        kit: kit
      }
    }).afterClosed().subscribe(result => {
      if (!result) return;

      const index = this.kits.findIndex(k => k.nombre === kit.nombre);
      if (index !== -1) {
        this.kits[index] = result;
        this.kits = [...this.kits]; 
      }
    });
  }

  eliminar(kit: Kit) {
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Eliminar Kit',
        message: `¿Deseas eliminar el kit "${kit.nombre}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      this.kits = this.kits.filter(k => k.nombre !== kit.nombre);
    });
  }
}
