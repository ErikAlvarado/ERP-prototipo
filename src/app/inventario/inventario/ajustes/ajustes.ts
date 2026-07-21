import { Component, importProvidersFrom } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { AjustesDialog } from './dialogs/ajustes-dialog/ajustes-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';



export interface PeriodicElement {

    fecha:string;
    producto:string;
    almacen:string;
    anterior:number;
    ajuste:number;
    nueva:number;
    motivo:string;
    usuario:string;

}



const ELEMENT_DATA:PeriodicElement[]=[


  {
    fecha:'16/07/2026',
    producto:'Taladro Bosch',
    almacen:'Principal',
    anterior:25,
    ajuste:5,
    nueva:30,
    motivo:'Conteo físico',
    usuario:'Administrador'
  },


  {
    fecha:'15/07/2026',
    producto:'Cable eléctrico',
    almacen:'Norte',
    anterior:100,
    ajuste:-8,
    nueva:92,
    motivo:'Producto dañado',
    usuario:'Juan Pérez'
  },


  {
    fecha:'14/07/2026',
    producto:'Martillo',
    almacen:'Sur',
    anterior:15,
    ajuste:2,
    nueva:17,
    motivo:'Diferencia inventario',
    usuario:'María López'
  }


];


@Component({
  selector: 'app-ajustes',
  imports: [SHARED_IMPORTS],
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.css',
})
export class Ajustes {
  constructor(private dialog: MatDialog) {}

displayedColumns = [
  'fecha',
  'producto',
  'almacen',
  'anterior',
  'ajuste',
  'nueva',
  'motivo',
  'usuario',
];



dataSource=new MatTableDataSource(ELEMENT_DATA);



currentSearch='';
currentWarehouse='';



applyFilter(){


  this.dataSource.filter=JSON.stringify({

  search:this.currentSearch.trim().toLowerCase(),

  warehouse:this.currentWarehouse


  });


  }



  ngOnInit(){


    this.dataSource.filterPredicate=(

      data:PeriodicElement,

      filter:string

      )=>{


      const search=JSON.parse(filter);



      const matchSearch=

      data.producto
      .toLowerCase()
      .includes(search.search);



      const matchWarehouse=

      search.warehouse === '' ||

      data.almacen === search.warehouse;



      return matchSearch && matchWarehouse;

    };
  }

  abrirAgregar() {

  this.dialog.open(AjustesDialog, {

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

editar(ajuste: PeriodicElement) {

  this.dialog.open(AjustesDialog, {

    width: '700px',

    data: {
      mode: 'edit',
      ajuste: ajuste
    }

  }).afterClosed().subscribe(result => {

    if (!result) return;

    const index = this.dataSource.data.findIndex(
      a =>
        a.fecha === ajuste.fecha &&
        a.producto === ajuste.producto &&
        a.almacen === ajuste.almacen
    );

    if (index !== -1) {

      this.dataSource.data[index] = result;

      this.dataSource.data = [
        ...this.dataSource.data
      ];

    }

  });

}

eliminar(ajuste: PeriodicElement) {

  this.dialog.open(ConfirmDialog, {

    width: '400px',

    data: {

      title: 'Eliminar ajuste',

      message: `¿Deseas eliminar el ajuste de "${ajuste.producto}"?`,

      confirmText: 'Eliminar',

      cancelText: 'Cancelar'

    }

  }).afterClosed().subscribe(confirmado => {

    if (!confirmado) return;

    this.dataSource.data = this.dataSource.data.filter(

      a =>
        !(
          a.fecha === ajuste.fecha &&
          a.producto === ajuste.producto &&
          a.almacen === ajuste.almacen
        )

    );

  });

}
}
