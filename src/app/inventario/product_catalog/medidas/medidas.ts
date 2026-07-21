import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MedidasDialog } from './dialogs/medidas-dialog/medidas-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';


export interface PeriodicElement {

  valor: number;
  unidad: string;
  acciones?: string;

}

const ELEMENT_DATA: PeriodicElement[] = [

  { valor: 1, unidad: 'Pz' },
  { valor: 5, unidad: 'Pz' },
  { valor: 10, unidad: 'Pz' },
  { valor: 25, unidad: 'M' },
  { valor: 50, unidad: 'M' },
  { valor: 100, unidad: 'M' },
  { valor: 1, unidad: 'Kg' },
  { valor: 5, unidad: 'Kg' },
  { valor: 1, unidad: 'L' },
  { valor: 20, unidad: 'L' },

];


@Component({
  selector: 'app-medidas',
  imports: [SHARED_IMPORTS],
  templateUrl: './medidas.html',
  styleUrl: './medidas.css',
})
export class Medidas {

  constructor(private dialog: MatDialog) {}

  displayedColumns: string[] = [

    'valor',
    'unidad',
    'acciones'

  ];

  dataSource = new MatTableDataSource(ELEMENT_DATA);

  currentSearch: string = '';
  currentUnit: string = '';

  applyFilter() {

    this.dataSource.filter = JSON.stringify({

      search: this.currentSearch.trim().toLowerCase(),
      unit: this.currentUnit

    });

  }

  ngOnInit() {

    this.dataSource.filterPredicate = (
      data: PeriodicElement,
      filter: string
    ) => {

      const search = JSON.parse(filter);

      const matchSearch =
        data.valor.toString().includes(search.search);

      const matchUnit =
        search.unit === '' ||
        data.unidad === search.unit;

      return matchSearch && matchUnit;

    };

  }


  abrirAgregar() {

    this.dialog.open(MedidasDialog, {

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


  editar(medida: PeriodicElement) {

    this.dialog.open(MedidasDialog, {

      width: '600px',

      data: {
        mode: 'edit',
        medida: medida
      }

    }).afterClosed().subscribe(result => {

      if (!result) return;

      const index = this.dataSource.data.findIndex(
        m => m.valor === medida.valor && m.unidad === medida.unidad
      );

      if (index !== -1) {

        this.dataSource.data[index] = result;

        this.dataSource.data = [
          ...this.dataSource.data
        ];

      }

    });

  }


  eliminar(medida: PeriodicElement) {

    this.dialog.open(ConfirmDialog, {

      width: '400px',

      data: {

        title: 'Eliminar medida',
        message: `¿Deseas eliminar "${medida.valor} ${medida.unidad}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'

      }

    }).afterClosed().subscribe(confirmado => {

      if (!confirmado) return;

      this.dataSource.data = this.dataSource.data.filter(

        m => !(m.valor === medida.valor && m.unidad === medida.unidad)

      );

    });

  }

}