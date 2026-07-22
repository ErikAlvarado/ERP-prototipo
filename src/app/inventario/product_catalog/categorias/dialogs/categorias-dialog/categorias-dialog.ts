import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../../shared/imports/shared-imports';
import { Categoria, EmpresaCategoriaOption } from '../../categorias';

export interface CategoryDialogData {
  mode: 'add' | 'edit';
  category?: Categoria;
  categorias: { id: string; nombre: string; idEmpresa: string }[];
  empresas: EmpresaCategoriaOption[];
  existentes: { nombre: string; idEmpresa: string }[];
}

@Component({
  selector: 'app-categorias-dialog',
  imports: [SHARED_IMPORTS],
  templateUrl: './categorias-dialog.html',
  styleUrls: ['../../../catalog-dialog.css', './categorias-dialog.css'],
})
export class CategoriasDialog {
  categoria: Pick<Categoria, 'nombre' | 'idEmpresa' | 'idPadre' | 'estado'>;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<CategoriasDialog>,
    @Inject(MAT_DIALOG_DATA) public data: CategoryDialogData,
  ) {
    this.categoria = data.category
      ? { nombre: data.category.nombre, idEmpresa: data.category.idEmpresa, idPadre: data.category.idPadre, estado: data.category.estado }
      : { nombre: '', idEmpresa: data.empresas[0]?.id || '', idPadre: '', estado: true };
  }

  get categoriasPadre(): { id: string; nombre: string; idEmpresa: string }[] {
    return this.data.categorias.filter(categoria => categoria.idEmpresa === this.categoria.idEmpresa);
  }

  cambiarEmpresa(): void {
    if (!this.categoriasPadre.some(categoria => categoria.id === this.categoria.idPadre)) this.categoria.idPadre = '';
    this.error = '';
  }

  guardar(): void {
    const nombre = this.categoria.nombre.trim();
    if (!nombre) { this.error = 'El nombre de la categoría es obligatorio.'; return; }
    if (!this.categoria.idEmpresa) { this.error = 'Selecciona la empresa de la categoría.'; return; }
    if (this.data.existentes.some(actual => actual.idEmpresa === this.categoria.idEmpresa && actual.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      this.error = 'Ya existe una categoría con ese nombre en la empresa seleccionada.';
      return;
    }
    this.dialogRef.close({ ...this.categoria, nombre });
  }
}
