import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MarcasDialog } from './dialogs/marcas-dialog/marcas-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

export interface PeriodicElement {
  nombre: string;
  estado: boolean;
  acciones?: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  { nombre: 'Truper', estado: true },
  { nombre: 'Urrea', estado: true },
  { nombre: 'Makita', estado: true },
  { nombre: 'Bosch', estado: false },
  { nombre: 'DeWalt', estado: true },
  { nombre: '3M', estado: true },
  { nombre: 'Siemens', estado: false },
  { nombre: 'Philips', estado: true },
  { nombre: 'Klein Tools', estado: true },
  { nombre: 'Stanley', estado: true },
];


@Component({
  selector: 'app-marcas',
  imports: [SHARED_IMPORTS],
  templateUrl: './marcas.html',
  styleUrl: './marcas.css',
})
export class Marcas {

  constructor(private dialog: MatDialog) {}

  displayedColumns: string[] = [
    'nombre',
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

    this.dataSource.filterPredicate = (
      data: PeriodicElement,
      filter: string
    ) => {

      const search = JSON.parse(filter);

      const matchSearch =
        data.nombre.toLowerCase().includes(search.search);

      const matchStatus =
        search.status === '' ||
        data.estado.toString() === search.status;

      return matchSearch && matchStatus;

    };
  }


  abrirAgregar() {

    this.dialog.open(MarcasDialog, {

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


  editar(marca: PeriodicElement) {

    this.dialog.open(MarcasDialog, {

      width: '600px',

      data: {
        mode: 'edit',
        marca: marca
      }

    }).afterClosed().subscribe(result => {

      if (!result) return;

      const index = this.dataSource.data.findIndex(
        m => m.nombre === marca.nombre
      );

      if (index !== -1) {

        this.dataSource.data[index] = result;

        this.dataSource.data = [
          ...this.dataSource.data
        ];
      }
    });
  }

  eliminar(marca: PeriodicElement) {
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Eliminar marca',
        message: `¿Deseas eliminar "${marca.nombre}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }

    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      this.dataSource.data = this.dataSource.data.filter(
        m => m.nombre !== marca.nombre
      );
    });

  }

}