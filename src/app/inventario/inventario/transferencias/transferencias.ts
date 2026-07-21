import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { TransferenciasDialog } from './dialogs/transferencias-dialog/transferencias-dialog';

export interface Transferencia {
  folio: string;
  producto: string;
  origen: string;
  destino: string;
  cantidad: number;
  fecha: string;
  usuario: string;
  estado: string;
}

const ELEMENT_DATA: Transferencia[] = [
  {
    folio: 'TR-0001',
    producto: 'Coca-Cola 600 ml',
    origen: 'Matriz',
    destino: 'Sucursal Norte',
    cantidad: 20,
    fecha: '2026-07-14',
    usuario: 'Administrador',
    estado: 'Completada'
  },
  {
    folio: 'TR-0002',
    producto: 'Sabritas 45 g',
    origen: 'Matriz',
    destino: 'Sucursal Sur',
    cantidad: 15,
    fecha: '2026-07-14',
    usuario: 'Juan Pérez',
    estado: 'Pendiente'
  },
  {
    folio: 'TR-0003',
    producto: 'Agua Ciel 1 L',
    origen: 'Sucursal Norte',
    destino: 'Sucursal Centro',
    cantidad: 50,
    fecha: '2026-07-13',
    usuario: 'María López',
    estado: 'Cancelada'
  }
];


@Component({
  selector: 'app-transferencias',
  imports: [ SHARED_IMPORTS],
  templateUrl: './transferencias.html',
  styleUrl: './transferencias.css',
})
export class Transferencias {
constructor(private dialog: MatDialog) {}

displayedColumns: string[] = [
    'folio',
    'producto',
    'origen',
    'destino',
    'cantidad',
    'fecha',
    'usuario',
    'estado',
    'acciones'
  ];

  dataSource = new MatTableDataSource(ELEMENT_DATA);

  currentSearch = '';
  currentStatus = '';

  ngOnInit() {
    this.dataSource.filterPredicate = (data: Transferencia, filter: string) => {
      const search = JSON.parse(filter);

      const matchSearch =
        data.folio.toLowerCase().includes(search.search) ||
        data.producto.toLowerCase().includes(search.search);

      const matchStatus =
        search.status === '' || data.estado === search.status;

      return matchSearch && matchStatus;
    };
  }

  applyFilter() {
    this.dataSource.filter = JSON.stringify({
      search: this.currentSearch.trim().toLowerCase(),
      status: this.currentStatus
    });
  }

abrirDialogo() {

  this.dialog.open(TransferenciasDialog, {

    width: '700px'

  }).afterClosed().subscribe(result => {

    if (!result) return;

    this.dataSource.data = [
      ...this.dataSource.data,
      result
    ];

  });

}

}
