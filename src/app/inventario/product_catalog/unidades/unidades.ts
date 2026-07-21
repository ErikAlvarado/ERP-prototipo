import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { UnidadesDialog } from './dialogs/unidades-dialog/unidades-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

export interface PeriodicElement {

  nombre: string;
  abreviatura: string;
  acciones?: string;

}

const ELEMENT_DATA: PeriodicElement[] = [

  { nombre: 'Pieza', abreviatura: 'pz' },
  { nombre: 'Metro', abreviatura: 'm' },
  { nombre: 'Centímetro', abreviatura: 'cm' },
  { nombre: 'Milímetro', abreviatura: 'mm' },
  { nombre: 'Kilogramo', abreviatura: 'kg' },
  { nombre: 'Gramo', abreviatura: 'g' },
  { nombre: 'Litro', abreviatura: 'L' },
  { nombre: 'Mililitro', abreviatura: 'ml' },
  { nombre: 'Caja', abreviatura: 'cj' },
  { nombre: 'Paquete', abreviatura: 'paq' },

];


@Component({
  selector: 'app-unidades',
  imports: [SHARED_IMPORTS],
  templateUrl: './unidades.html',
  styleUrl: './unidades.css',
})
export class Unidades {

  constructor(private dialog: MatDialog) {}

  displayedColumns: string[] = [

    'nombre',
    'abreviatura',
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
             data.abreviatura.toLowerCase().includes(search.search);

    };

  }


  abrirAgregar() {

    this.dialog.open(UnidadesDialog, {

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


  editar(unidad: PeriodicElement) {

    this.dialog.open(UnidadesDialog, {

      width: '600px',

      data: {
        mode: 'edit',
        unidad: unidad
      }

    }).afterClosed().subscribe(result => {

      if (!result) return;

      const index = this.dataSource.data.findIndex(
        u => u.nombre === unidad.nombre
      );

      if (index !== -1) {

        this.dataSource.data[index] = result;

        this.dataSource.data = [
          ...this.dataSource.data
        ];

      }

    });

  }


  eliminar(unidad: PeriodicElement) {

    this.dialog.open(ConfirmDialog, {

      width: '400px',

      data: {

        title: 'Eliminar unidad',

        message: `¿Deseas eliminar "${unidad.nombre}"?`,

        confirmText: 'Eliminar',

        cancelText: 'Cancelar'

      }

    }).afterClosed().subscribe(confirmado => {

      if (!confirmado) return;

      this.dataSource.data = this.dataSource.data.filter(

        u => u.nombre !== unidad.nombre

      );

    });

  }

}