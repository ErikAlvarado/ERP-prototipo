import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';

export interface PeriodicElement {

  sku: string;
  producto: string;
  almacen: string;
  stock: number;
  minimo: number;
  critico: number;
  anaquel: string;
  actualizacion: string;

}

const ELEMENT_DATA: PeriodicElement[] = [

  {
    sku:'P001',
    producto:'Taladro Bosch',
    almacen:'Matriz',
    stock:35,
    minimo:10,
    critico:5,
    anaquel:'A-01',
    actualizacion:'16/07/2026'
  },
  {
    sku:'P002',
    producto:'Desarmador',
    almacen:'Norte',
    stock:8,
    minimo:10,
    critico:5,
    anaquel:'B-03',
    actualizacion:'16/07/2026'
  },
  {
    sku:'P003',
    producto:'Pinzas',
    almacen:'Sur',
    stock:3,
    minimo:8,
    critico:4,
    anaquel:'C-10',
    actualizacion:'15/07/2026'
  }

];


@Component({
  selector: 'app-existencias',
  imports: [SHARED_IMPORTS],
  templateUrl: './existencias.html',
  styleUrl: './existencias.css',
})
export class Existencias {

  displayedColumns = [
    'sku',
    'producto',
    'almacen',
    'stock',
    'minimo',
    'critico',
    'anaquel',
    'actualizacion',
    // 'acciones'
  ];

  dataSource = new MatTableDataSource(ELEMENT_DATA);

  currentSearch = '';
  currentBranch = '';
  currentStock = '';

  applyFilter(){

    this.dataSource.filter = JSON.stringify({

      search: this.currentSearch.trim().toLowerCase(),
      branch: this.currentBranch,
      stock: this.currentStock

    });

  }

  ngOnInit(){

    this.dataSource.filterPredicate = (data: PeriodicElement, filter:string)=>{

      const search = JSON.parse(filter);

      const matchSearch =
        data.producto.toLowerCase().includes(search.search) ||
        data.sku.toLowerCase().includes(search.search);

      const matchBranch =
        search.branch === '' ||
        data.almacen === search.branch;

      const estado =
        data.stock <= data.critico
        ? 'Crítico'
        : data.stock <= data.minimo
        ? 'Bajo'
        : 'Normal';

      const matchStock =
        search.stock === '' ||
        estado === search.stock;

      return matchSearch && matchBranch && matchStock;

    };

  }

}
