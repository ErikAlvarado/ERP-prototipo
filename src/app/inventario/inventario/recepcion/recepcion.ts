import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';

type EstadoRecepcion = 'Pendiente' | 'En revisión' | 'Recibida' | 'Con incidencias';

interface RecepcionInventario {
  folio: string;
  orden: string;
  proveedor: string;
  almacen: string;
  fecha: string;
  productos: number;
  unidades: number;
  responsable: string;
  estado: EstadoRecepcion;
}

const RECEPCIONES: RecepcionInventario[] = [
  { folio: 'REC-0006', orden: 'OC-2026-0168', proveedor: 'Tecnología del Centro', almacen: 'Almacén Central', fecha: '2026-07-24', productos: 4, unidades: 38, responsable: 'María López', estado: 'Pendiente' },
  { folio: 'REC-0005', orden: 'OC-2026-0162', proveedor: 'Distribuidora Nova', almacen: 'Sucursal Norte', fecha: '2026-07-23', productos: 7, unidades: 52, responsable: 'Carlos Méndez', estado: 'En revisión' },
  { folio: 'REC-0004', orden: 'OC-2026-0157', proveedor: 'Accesorios MX', almacen: 'Almacén Central', fecha: '2026-07-22', productos: 3, unidades: 120, responsable: 'Ana Torres', estado: 'Recibida' },
  { folio: 'REC-0003', orden: 'OC-2026-0151', proveedor: 'Cómputo Empresarial', almacen: 'Sucursal Sur', fecha: '2026-07-21', productos: 5, unidades: 18, responsable: 'José Ramírez', estado: 'Con incidencias' },
  { folio: 'REC-0002', orden: 'OC-2026-0144', proveedor: 'Electrónica Nacional', almacen: 'Almacén Central', fecha: '2026-07-19', productos: 6, unidades: 44, responsable: 'María López', estado: 'Recibida' },
  { folio: 'REC-0001', orden: 'OC-2026-0139', proveedor: 'Soluciones de Oficina', almacen: 'Sucursal Norte', fecha: '2026-07-18', productos: 2, unidades: 75, responsable: 'Carlos Méndez', estado: 'Recibida' },
];

@Component({
  selector: 'app-recepcion',
  imports: [...SHARED_IMPORTS, DatePipe, MatMenuModule, MatPaginatorModule, MatSnackBarModule],
  templateUrl: './recepcion.html',
  styleUrl: './recepcion.css',
})
export class Recepcion implements AfterViewInit {
  readonly displayedColumns = ['folio', 'orden', 'proveedor', 'almacen', 'fecha', 'contenido', 'responsable', 'estado', 'acciones'];
  readonly dataSource = new MatTableDataSource<RecepcionInventario>(RECEPCIONES);
  busqueda = '';
  estado = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private dialog: MatDialog, private snackBar: MatSnackBar) {
    this.dataSource.filterPredicate = (item, raw) => {
      const filtro = JSON.parse(raw) as { busqueda: string; estado: string };
      const texto = `${item.folio} ${item.orden} ${item.proveedor} ${item.almacen} ${item.responsable}`.toLowerCase();
      return texto.includes(filtro.busqueda) && (!filtro.estado || item.estado === filtro.estado);
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  get pendientes(): number {
    return this.dataSource.data.filter(item => item.estado === 'Pendiente' || item.estado === 'En revisión').length;
  }

  get recibidas(): number {
    return this.dataSource.data.filter(item => item.estado === 'Recibida').length;
  }

  get incidencias(): number {
    return this.dataSource.data.filter(item => item.estado === 'Con incidencias').length;
  }

  get unidades(): number {
    return this.dataSource.data.reduce((total, item) => total + item.unidades, 0);
  }

  filtrar(): void {
    this.dataSource.filter = JSON.stringify({ busqueda: this.busqueda.trim().toLowerCase(), estado: this.estado });
    this.paginator?.firstPage();
  }

  setEstado(estado: string): void {
    this.estado = estado;
    this.filtrar();
  }

  nuevaRecepcion(): void {
    this.dialog.open(RecepcionDialog, {
      width: '680px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
    }).afterClosed().subscribe((recepcion?: Omit<RecepcionInventario, 'folio' | 'estado'>) => {
      if (!recepcion) return;
      const siguiente = String(this.dataSource.data.length + 1).padStart(4, '0');
      this.dataSource.data = [{ ...recepcion, folio: `REC-${siguiente}`, estado: 'Pendiente' }, ...this.dataSource.data];
      this.filtrar();
      this.snackBar.open('Recepción registrada correctamente', 'Cerrar', { duration: 3500 });
    });
  }

  actualizarEstado(item: RecepcionInventario, estado: EstadoRecepcion): void {
    this.dataSource.data = this.dataSource.data.map(actual => actual.folio === item.folio ? { ...actual, estado } : actual);
    this.filtrar();
    this.snackBar.open(`${item.folio} cambió a ${estado}`, 'Cerrar', { duration: 3000 });
  }

  claseEstado(estado: EstadoRecepcion): string {
    return estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  }
}

@Component({
  selector: 'app-recepcion-dialog',
  imports: [...SHARED_IMPORTS],
  templateUrl: './recepcion-dialog.html',
  styleUrl: './recepcion-dialog.css',
})
export class RecepcionDialog {
  readonly form;
  readonly almacenes = ['Almacén Central', 'Sucursal Norte', 'Sucursal Sur'];

  constructor(
    fb: FormBuilder,
    private dialogRef: MatDialogRef<RecepcionDialog>,
  ) {
    this.form = fb.nonNullable.group({
      orden: ['', Validators.required],
      proveedor: ['', Validators.required],
      almacen: ['', Validators.required],
      fecha: [new Date().toISOString().slice(0, 10), Validators.required],
      productos: [1, [Validators.required, Validators.min(1)]],
      unidades: [1, [Validators.required, Validators.min(1)]],
      responsable: ['', Validators.required],
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }
}
