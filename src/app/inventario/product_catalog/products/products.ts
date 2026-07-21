import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { ProductD } from './dialogs/product-d/product-d';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';


export interface PeriodicElement {
  sku: string;
  codigo: number;
  producto: string;
  marca: string;
  categoria: string;
  medida: string;
  precio: number;
  pos: boolean;
  linea: boolean;
  estado: boolean;
  acciones?: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  {sku: '001', codigo: 1234567890123, producto: 'Producto A', marca: 'Marca A', categoria: 'Categoría 1', medida: 'Unidad', precio: 10.99, pos: true, linea: true, estado: true},
  {sku: '002', codigo: 2345678901234, producto: 'Producto B', marca: 'Marca B', categoria: 'Categoría 2', medida: 'Caja', precio: 25.50, pos: false, linea: true, estado: false},
  {sku: '003', codigo: 3456789012345, producto: 'Producto C', marca: 'Marca C', categoria: 'Categoría 1', medida: 'Paquete', precio: 15.75, pos: true, linea: false, estado: true},
  {sku: '004', codigo: 4567890123456, producto: 'Producto D', marca: 'Marca D', categoria: 'Categoría 3', medida: 'Unidad', precio: 8.99, pos: false, linea: true, estado: true},
  {sku: '005', codigo: 5678901234567, producto: 'Producto E', marca: 'Marca E', categoria: 'Categoría 2', medida: 'Caja', precio: 30.00, pos: true, linea: false, estado: false},
  {sku: '006', codigo: 6789012345678, producto: 'Producto F', marca: 'Marca F', categoria: 'Categoría 1', medida: 'Paquete', precio: 12.50, pos: false, linea: true, estado: true},
  {sku: '007', codigo: 7890123456789, producto: 'Producto G', marca: 'Marca G', categoria: 'Categoría 3', medida: 'Unidad', precio: 9.99, pos: true, linea: true, estado: true},
  {sku: '008', codigo: 8901234567890, producto: 'Producto H', marca: 'Marca H', categoria: 'Categoría 2', medida: 'Caja', precio: 28.75, pos: false, linea: false, estado: false},
  {sku: '009', codigo: 9012345678901, producto: 'Producto I', marca: 'Marca I', categoria: 'Categoría 1', medida: 'Paquete', precio: 14.25, pos: true, linea: true, estado: true},
  {sku: '010', codigo: 1234567890123, producto: 'Producto J', marca: 'Marca J', categoria: 'Categoría 3', medida: 'Unidad', precio: 11.50, pos: false, linea: false, estado: true},
];



@Component({
  selector: 'app-products',
  imports: [SHARED_IMPORTS],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {
  constructor(private dialog: MatDialog) {}
  displayedColumns: string[] = ['sku', 'codigo', 'producto', 'marca', 'categoria', 'medida', 'precio', 'pos', 'linea', 'estado', 'acciones'];

  dataSource =  new MatTableDataSource(ELEMENT_DATA);

currentSearch: string = '';
  currentCategory: string = '';

  applyFilter() {
    this.dataSource.filter = JSON.stringify({
      search: this.currentSearch.trim().toLowerCase(),
      category: this.currentCategory
    });
  }

  ngOnInit() {
    this.dataSource.filterPredicate = (data: PeriodicElement, filter: string) => {
      const search = JSON.parse(filter);
      const matchSearch = data.producto.toLowerCase().includes(search.search) ||
                          data.sku.toLowerCase().includes(search.search);
      const matchCategory = search.category === '' || data.categoria === search.category;
      return matchSearch && matchCategory;
    };
  }
  
  abrirAgregar() {

    this.dialog.open(ProductD, {

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

  editar(producto: PeriodicElement) {

    this.dialog.open(ProductD, {

      width: '700px',

      data: {
        mode: 'edit',
        product: producto
      }

    }).afterClosed().subscribe(result => {

      if (!result) return;

      const index = this.dataSource.data.findIndex(
        p => p.sku === producto.sku
      );

      if (index !== -1) {

        this.dataSource.data[index] = result;

        this.dataSource.data = [
          ...this.dataSource.data
        ];

      }

    });

  }

  eliminar(producto: PeriodicElement) {

  this.dialog.open(ConfirmDialog, {

    width: '400px',

    data: {

      title: 'Eliminar producto',

      message: `¿Deseas eliminar "${producto.producto}"?`,

      confirmText: 'Eliminar',

      cancelText: 'Cancelar'

    }

  }).afterClosed().subscribe(confirmado => {

    if (!confirmado) return;

    this.dataSource.data = this.dataSource.data.filter(

      p => p.sku !== producto.sku

    );

  });

}
 
}

