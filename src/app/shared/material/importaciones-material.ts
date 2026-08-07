import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

export { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
export { MatSnackBar } from '@angular/material/snack-bar';

export const IMPORTACIONES_MATERIAL_FORMULARIOS = [
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
];

export const IMPORTACIONES_MATERIAL_PROVEEDORES = [
  MatButtonModule,
  MatCardModule,
  MatChipsModule,
  MatDialogModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatSelectModule,
  MatSnackBarModule,
];

export const IMPORTACIONES_MATERIAL_COMPRA_PROVEEDOR = [
  MatButtonModule,
  MatCardModule,
  MatDatepickerModule,
  MatDialogModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatNativeDateModule,
  MatPaginatorModule,
  MatSelectModule,
];

export const IMPORTACIONES_MATERIAL_NAVEGACION = [
  MatButtonModule,
  MatDividerModule,
  MatIconModule,
  MatListModule,
];

export const IMPORTACIONES_MATERIAL_CATALOGO = [
  MatButtonModule,
  MatCardModule,
  MatIconModule,
  MatMenuModule,
  MatTooltipModule,
];

// Componentes Material usados por la pantalla de compras y sus dialogos.
export const IMPORTACIONES_MATERIAL_COMPRAS = [
  MatButtonModule,
  MatButtonToggleModule,
  MatCardModule,
  MatDatepickerModule,
  MatDialogModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatNativeDateModule,
  MatPaginatorModule,
  MatSelectModule,
  MatTableModule,
  MatTabsModule,
  MatTooltipModule,
];

export const IMPORTACIONES_MATERIAL_CONSULTAS = [
  FormsModule,
  MatButtonModule,
  MatCardModule,
  MatChipsModule,
  MatDatepickerModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatMenuModule,
  MatNativeDateModule,
  MatPaginatorModule,
  MatSelectModule,
  MatTableModule,
  MatTabsModule,
  MatTooltipModule,
];

export const IMPORTACIONES_MATERIAL_TABLAS = [MatTableModule];

export const IMPORTACIONES_MATERIAL_PREFERENCIAS = [
  MatButtonModule,
  MatCardModule,
  MatIconModule,
  MatTooltipModule,
];
