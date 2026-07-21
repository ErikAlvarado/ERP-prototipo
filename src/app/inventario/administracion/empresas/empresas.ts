import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { MatDialog } from '@angular/material/dialog';
import { EmpresasDialog } from './dialogs/empresas-dialog/empresas-dialog';

export interface PeriodicElement {

  empresa: string;
  razonSocial: string;
  rfc: string;
  telefono: string;
  estado: boolean;
  acciones?: string;

}

const ELEMENT_DATA: PeriodicElement[] = [

  {
    empresa: 'Ferretería Central',
    razonSocial: 'Ferretería Central S.A. de C.V.',
    rfc: 'FCE240101ABC',
    telefono: '8123456789',
    estado: true
  },
  {
    empresa: 'Materiales del Norte',
    razonSocial: 'Materiales del Norte S.A. de C.V.',
    rfc: 'MDN240201XYZ',
    telefono: '8187654321',
    estado: true
  },
  {
    empresa: 'ConstruMax',
    razonSocial: 'ConstruMax Comercializadora S.A. de C.V.',
    rfc: 'CON240301AAA',
    telefono: '8112345678',
    estado: false
  }

];

@Component({
  selector: 'app-empresas',
  imports: [SHARED_IMPORTS],
  templateUrl: './empresas.html',
  styleUrl: './empresas.css',
})
export class Empresas {
  constructor(private dialog: MatDialog) {}
  displayedColumns = [
    'empresa',
    'razonSocial',
    'rfc',
    'telefono',
    'estado',
    'acciones'
  ];

  dataSource = new MatTableDataSource(ELEMENT_DATA);

  currentSearch = '';
  currentStatus = '';

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
        data.empresa.toLowerCase().includes(search.search) ||
        data.rfc.toLowerCase().includes(search.search);

      const matchStatus =
        search.status === '' ||
        data.estado.toString() === search.status;

      return matchSearch && matchStatus;

    };

  }
  abrirDialogo() {
  this.dialog.open(EmpresasDialog, {
    width: '700px',
    data: { mode: 'add' }
  }).afterClosed().subscribe(result => {
    if (!result) return;
    this.dataSource.data = [...this.dataSource.data, result];
  });
}
editar(empresa: PeriodicElement) {
    this.dialog.open(EmpresasDialog, {
      width: '700px',
      data: {
        mode: 'edit',
        empresa: empresa
      }
    }).afterClosed().subscribe(result => {
      if (!result) return;
      const index = this.dataSource.data.findIndex(
        e => e.rfc === empresa.rfc
      );

      if (index !== -1) {
        this.dataSource.data[index] = result;
        this.dataSource.data = [...this.dataSource.data]; 
      }
    });
  }

  eliminar(empresa: PeriodicElement) {
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Eliminar empresa',
        message: `¿Deseas eliminar "${empresa.empresa}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      this.dataSource.data = this.dataSource.data.filter(
        e => e.rfc !== empresa.rfc
      );
    });
  }
}
