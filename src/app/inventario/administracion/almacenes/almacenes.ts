import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { AlmacenesDialog } from './dialogs/almacenes-dialog/almacenes-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

export interface Almacen {
  clave: string;
  nombre: string;
  responsable: string;
  telefono: string;
  direccion: string;
  estado: boolean;
}

const ELEMENT_DATA: Almacen[] = [
  {
    clave: 'ALM001',
    nombre: 'Almacén Principal',
    responsable: 'Juan Pérez',
    telefono: '5551234567',
    direccion: 'Av. Principal #100',
    estado: true
  },
  {
    clave: 'ALM002',
    nombre: 'Almacén Norte',
    responsable: 'María López',
    telefono: '5559876543',
    direccion: 'Calle Norte #25',
    estado: true
  },
  {
    clave: 'ALM003',
    nombre: 'Almacén Sur',
    responsable: 'Carlos Ramírez',
    telefono: '5556543210',
    direccion: 'Blvd. Sur #58',
    estado: false
  },
  {
    clave: 'ALM004',
    nombre: 'Almacén Temporal',
    responsable: 'Ana Torres',
    telefono: '5554567890',
    direccion: 'Zona Industrial',
    estado: true
  }
];

@Component({
  selector: 'app-almacenes',
  imports: [SHARED_IMPORTS],
  templateUrl: './almacenes.html',
  styleUrl: './almacenes.css',
})
export class Almacenes {
  constructor(private dialog: MatDialog) {}

    displayedColumns: string[] = [
    'clave',
    'nombre',
    'responsable',
    'telefono',
    'direccion',
    'estado',
    'acciones'
  ];

  dataSource = new MatTableDataSource(ELEMENT_DATA);

  currentSearch: string = '';
  currentStatus: string = '';

  applyFilter() {
    this.dataSource.filter = JSON.stringify({
      search: this.currentSearch.trim().toLowerCase(),
      status: this.currentStatus
    });
  }

  ngOnInit() {
    this.dataSource.filterPredicate = (data: Almacen, filter: string) => {

      const search = JSON.parse(filter);

      const matchSearch =
        data.nombre.toLowerCase().includes(search.search) ||
        data.clave.toLowerCase().includes(search.search);

      const matchStatus =
        search.status === '' || data.estado === search.status;

      return matchSearch && matchStatus;
    };
  }

abrirDialogo() {

  this.dialog.open(AlmacenesDialog, {

    width: '650px',

    data: {
      mode: 'add'
    }

  }).afterClosed().subscribe(result => {

    if (!result) return;

    this.dataSource.data = [
      ...this.dataSource.data,
      result
    ];

  });

}

editar(almacen: Almacen) {

  this.dialog.open(AlmacenesDialog, {

    width: '650px',

    data: {
      mode: 'edit',
      almacen: almacen
    }

  }).afterClosed().subscribe(result => {

    if (!result) return;

    const index = this.dataSource.data.findIndex(
      a => a.clave === almacen.clave
    );

    if (index !== -1) {

      this.dataSource.data[index] = result;

      this.dataSource.data = [
        ...this.dataSource.data
      ];

    }

  });

}
eliminar(almacen: Almacen) {

  this.dialog.open(ConfirmDialog, {

    width: '400px',

    data: {

      title: 'Eliminar almacén',

      message: `¿Deseas eliminar "${almacen.nombre}"?`,

      confirmText: 'Eliminar',

      cancelText: 'Cancelar'

    }

  }).afterClosed().subscribe(confirmado => {

    if (!confirmado) return;

    this.dataSource.data = this.dataSource.data.filter(
      a => a.clave !== almacen.clave
    );

  });

}

}
