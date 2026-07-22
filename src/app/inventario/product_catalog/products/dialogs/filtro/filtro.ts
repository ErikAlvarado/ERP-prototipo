import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';

export interface FiltrosProducto {
  empresa: string;
  categoria: string;
  marca: string;
  unidad: string;
  tipo: string;
  ubicacion: string;
  claveSat: string;
  conCodigo: boolean | null;
  pos: boolean | null;
  visible: boolean | null;
  estado: boolean | null;
  requiereReceta: boolean | null;
  usarExistencias: boolean | null;
  usarLotes: boolean | null;
}

export interface DatosFiltroProducto {
  filtros: FiltrosProducto;
  empresas: string[];
  categorias: string[];
  marcas: string[];
  unidades: string[];
  tipos: string[];
}

const FILTROS_VACIOS: FiltrosProducto = {
  empresa: '',
  categoria: '',
  marca: '',
  unidad: '',
  tipo: '',
  ubicacion: '',
  claveSat: '',
  conCodigo: null,
  pos: null,
  visible: null,
  estado: null,
  requiereReceta: null,
  usarExistencias: null,
  usarLotes: null,
};

@Component({
  selector: 'app-filtro',
  imports: [SHARED_IMPORTS],
  templateUrl: './filtro.html',
  styleUrl: './filtro.css',
})
export class Filtro {
  filtros: FiltrosProducto = { ...FILTROS_VACIOS };

  constructor(
    public dialogRef: MatDialogRef<Filtro>,
    @Inject(MAT_DIALOG_DATA) public data: DatosFiltroProducto,
  ) {
    if (data?.filtros) this.filtros = { ...FILTROS_VACIOS, ...data.filtros };
  }

  seleccionar(
    campo: 'conCodigo' | 'pos' | 'visible' | 'estado' | 'requiereReceta' | 'usarExistencias' | 'usarLotes',
    valor: boolean,
  ): void {
    this.filtros = { ...this.filtros, [campo]: this.filtros[campo] === valor ? null : valor };
  }

  get conteoFiltros(): number {
    return Object.values(this.filtros).filter(valor => valor !== '' && valor !== null).length;
  }

  limpiar(): void {
    this.filtros = { ...FILTROS_VACIOS };
  }

  aplicar(): void {
    this.dialogRef.close({
      ...this.filtros,
      ubicacion: this.filtros.ubicacion.trim(),
      claveSat: this.filtros.claveSat.trim(),
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
