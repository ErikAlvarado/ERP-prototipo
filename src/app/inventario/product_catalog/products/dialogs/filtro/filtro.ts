import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms'; // Permite el ngModel en los selects

@Component({
  selector: 'app-filtro',
  imports: [SHARED_IMPORTS, MatIconModule, MatButtonModule, FormsModule],
  templateUrl: './filtro.html',
  styleUrl: './filtro.css'
})
export class Filtro {
  
  // Objeto reactivo para rastrear qué presiona el usuario
  filtros = {
    categoria: '',
    marca: '',
    tipo: '',
    conCodigo: null as boolean | null,
    visible: null as boolean | null
  };

  constructor(
    public dialogRef: MatDialogRef<Filtro>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Si ya había filtros aplicados, los cargamos para que se mantengan visualmente
    if (data && data.filtros) {
      this.filtros = { ...data.filtros };
    }
  }

  // Funciones Toggle para los Chips
  setTipo(tipo: string) { this.filtros.tipo = this.filtros.tipo === tipo ? '' : tipo; }
  setCodigo(tiene: boolean) { this.filtros.conCodigo = this.filtros.conCodigo === tiene ? null : tiene; }
  setVisible(visible: boolean) { this.filtros.visible = this.filtros.visible === visible ? null : visible; }

  // Cuenta dinámica para el botón "(X) Limpiar"
  get conteoFiltros(): number {
    let count = 0;
    if (this.filtros.categoria) count++;
    if (this.filtros.marca) count++;
    if (this.filtros.tipo) count++;
    if (this.filtros.conCodigo !== null) count++;
    if (this.filtros.visible !== null) count++;
    return count;
  }

  limpiar() {
    this.filtros = { categoria: '', marca: '', tipo: '', conCodigo: null, visible: null };
  }

  aplicar() {
    this.dialogRef.close(this.filtros); // Enviamos los datos de regreso a products.ts
  }

  cerrar() {
    this.dialogRef.close(); // Cerramos sin aplicar cambios
  }
}