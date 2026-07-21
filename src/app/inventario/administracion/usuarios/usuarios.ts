import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { UsuariosDialog } from './dialogs/usuarios-dialog/usuarios-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

export interface Usuario {
  nombre: string;
  usuario: string;
  correo: string;
  rol: string;
  almacen: string;
  estado: boolean;
}

const ELEMENT_DATA: Usuario[] = [
  {
    nombre: 'Juan Pérez',
    usuario: 'jperez',
    correo: 'juan@empresa.com',
    rol: 'Administrador',
    almacen: 'Almacén Principal',
    estado: true
  },
  {
    nombre: 'María López',
    usuario: 'mlopez',
    correo: 'maria@empresa.com',
    rol: 'Gerente',
    almacen: 'Almacén Norte',
    estado: true
  },
  {
    nombre: 'Carlos Ramírez',
    usuario: 'cramirez',
    correo: 'carlos@empresa.com',
    rol: 'Cajero',
    almacen: 'Almacén Principal',
    estado: false
  },
  {
    nombre: 'Ana Torres',
    usuario: 'atorres',
    correo: 'ana@empresa.com',
    rol: 'Almacenista',
    almacen: 'Almacén Sur',
    estado: true
  }
];

@Component({
  selector: 'app-usuarios',
  imports: [SHARED_IMPORTS],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios {
  constructor(private dialog: MatDialog) {}
  displayedColumns: string[] = [
    'nombre',
    'usuario',
    'correo',
    'rol',
    'almacen',
    'estado',
    'acciones'
  ];

  dataSource = new MatTableDataSource(ELEMENT_DATA);

  currentSearch: string = '';
  currentRole: string = '';

  applyFilter() {
    this.dataSource.filter = JSON.stringify({
      search: this.currentSearch.trim().toLowerCase(),
      role: this.currentRole
    });
  }

  ngOnInit() {
    this.dataSource.filterPredicate = (data: Usuario, filter: string) => {

      const search = JSON.parse(filter);

      const matchSearch =
        data.nombre.toLowerCase().includes(search.search) ||
        data.usuario.toLowerCase().includes(search.search) ||
        data.correo.toLowerCase().includes(search.search);

      const matchRole =
        search.role === '' || data.rol === search.role;

      return matchSearch && matchRole;
    };
  }

abrirDialogo() {

  this.dialog.open(UsuariosDialog, {

    width: '700px',

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
editar(usuario: Usuario) {

  this.dialog.open(UsuariosDialog, {

    width: '700px',

    data: {
      mode: 'edit',
      usuario: usuario
    }

  }).afterClosed().subscribe(result => {

    if (!result) return;

    const index = this.dataSource.data.findIndex(
      u => u.usuario === usuario.usuario
    );

    if (index !== -1) {

      this.dataSource.data[index] = result;

      this.dataSource.data = [
        ...this.dataSource.data
      ];

    }

  });

}
eliminar(usuario: Usuario) {

  this.dialog.open(ConfirmDialog, {

    width: '400px',

    data: {

      title: 'Eliminar usuario',

      message: `¿Deseas eliminar al usuario "${usuario.nombre}"?`,

      confirmText: 'Eliminar',

      cancelText: 'Cancelar'

    }

  }).afterClosed().subscribe(confirmado => {

    if (!confirmado) return;

    this.dataSource.data = this.dataSource.data.filter(
      u => u.usuario !== usuario.usuario
    );

  });

}
}
