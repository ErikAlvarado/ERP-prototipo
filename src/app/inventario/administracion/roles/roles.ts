import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { RolesDialog } from './dialogs/roles-dialog/roles-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

export interface PeriodicElement {

  nombre: string;
  descripcion: string;
  usuarios: number;
  acciones?: string;

}

const ELEMENT_DATA: PeriodicElement[] = [

  {
    nombre: 'Administrador',
    descripcion: 'Acceso total al sistema.',
    usuarios: 2
  },
  {
    nombre: 'Gerente',
    descripcion: 'Gestiona operaciones y reportes.',
    usuarios: 4
  },
  {
    nombre: 'Almacenista',
    descripcion: 'Control de inventario y movimientos.',
    usuarios: 8
  },
  {
    nombre: 'Cajero',
    descripcion: 'Operaciones de punto de venta.',
    usuarios: 12
  },
  {
    nombre: 'Consulta',
    descripcion: 'Acceso únicamente de lectura.',
    usuarios: 1
  }

];


@Component({
  selector: 'app-roles',
  imports: [SHARED_IMPORTS],
  templateUrl: './roles.html',
  styleUrl: './roles.css',
})
export class Roles {
  constructor(private dialog: MatDialog) {}
  displayedColumns: string[] = [
    'nombre',
    'descripcion',
    'usuarios',
    'acciones'
  ];

  dataSource = new MatTableDataSource(ELEMENT_DATA);

  currentSearch: string = '';

  applyFilter() {

    this.dataSource.filter = JSON.stringify({

      search: this.currentSearch.trim().toLowerCase()

    });

  }

  ngOnInit() {

    this.dataSource.filterPredicate = (
      data: PeriodicElement,
      filter: string
    ) => {

      const search = JSON.parse(filter);

      return data.nombre.toLowerCase().includes(search.search) ||
             data.descripcion.toLowerCase().includes(search.search);

    };

  }
  abrirDialogo() {

  this.dialog.open(RolesDialog, {

    width: '600px',

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

editar(rol: PeriodicElement) {

  this.dialog.open(RolesDialog, {

    width: '600px',

    data: {
      mode: 'edit',
      rol: rol
    }

  }).afterClosed().subscribe(result => {

    if (!result) return;


    const index = this.dataSource.data.findIndex(
      r => r.nombre === rol.nombre
    );


    if (index !== -1) {

      this.dataSource.data[index] = result;


      this.dataSource.data = [
        ...this.dataSource.data
      ];

    }

  });

}

eliminar(rol: PeriodicElement) {

  this.dialog.open(ConfirmDialog, {

    width: '400px',

    data: {

      title: 'Eliminar rol',

      message: `¿Deseas eliminar el rol "${rol.nombre}"?`,

      confirmText: 'Eliminar',

      cancelText: 'Cancelar'

    }

  }).afterClosed().subscribe(confirmado => {


    if (!confirmado) return;


    this.dataSource.data = this.dataSource.data.filter(

      r => r.nombre !== rol.nombre

    );


  });

}
}
