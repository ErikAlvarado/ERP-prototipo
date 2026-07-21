import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';

export interface PeriodicElement {

  fecha:string;
  sku:string;
  producto:string;
  almacen:string;
  movimiento:string;
  cantidad:number;
  anterior:number;
  nueva:number;
  referencia:string;
  usuario:string;

}

const ELEMENT_DATA:PeriodicElement[]=[

  {
  fecha:'16/07/2026',
  sku:'P001',
  producto:'Taladro Bosch',
  almacen:'Principal',
  movimiento:'Entrada',
  cantidad:20,
  anterior:30,
  nueva:50,
  referencia:'COMP-00015',
  usuario:'Administrador'
  },
  {
  fecha:'16/07/2026',
  sku:'P002',
  producto:'Pinzas',
  almacen:'Norte',
  movimiento:'Salida',
  cantidad:2,
  anterior:10,
  nueva:8,
  referencia:'VENT-00045',
  usuario:'Juan Pérez'
  },
  {
  fecha:'15/07/2026',
  sku:'P003',
  producto:'Desarmador',
  almacen:'Principal',
  movimiento:'Transferencia',
  cantidad:15,
  anterior:40,
  nueva:25,
  referencia:'TRA-00008',
  usuario:'Administrador'
  }

];

@Component({
  selector: 'app-kardex',
  imports: [SHARED_IMPORTS],
  templateUrl: './kardex.html',
  styleUrl: './kardex.css',
})
export class Kardex {
displayedColumns=[

  'fecha',
  'sku',
  'producto',
  'almacen',
  'movimiento',
  'cantidad',
  'anterior',
  'nueva',
  'referencia',
  'usuario'

];

dataSource=new MatTableDataSource(ELEMENT_DATA);

currentSearch='';
currentWarehouse='';
currentMovement='';

applyFilter(){

  this.dataSource.filter=JSON.stringify({

  search:this.currentSearch.trim().toLowerCase(),
  warehouse:this.currentWarehouse,
  movement:this.currentMovement

  });

}

ngOnInit(){

    this.dataSource.filterPredicate=(data:PeriodicElement,filter:string)=>{

    const search=JSON.parse(filter);

    const matchSearch=

    data.producto.toLowerCase().includes(search.search)||
    data.sku.toLowerCase().includes(search.search);

    const matchWarehouse=

    search.warehouse===''||
    data.almacen===search.warehouse;

    const matchMovement=

    search.movement===''||
    data.movimiento===search.movement;

    return matchSearch&&matchWarehouse&&matchMovement;

    };

  }

}
