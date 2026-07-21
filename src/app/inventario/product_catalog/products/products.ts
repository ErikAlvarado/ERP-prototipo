import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu'; // <-- Importante para el menú
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common'; 
import { ProductD } from './dialogs/product-d/product-d';
import { Filtro } from './dialogs/filtro/filtro';
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
  tipo: string;
  almacen: string;
  acciones?: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  {sku: '001', codigo: 1234567890123, producto: 'Aerosol WD-40', marca: 'WD-40', categoria: 'Herramientas', medida: 'Unidad', precio: 155.00, pos: true, linea: true, estado: true, tipo: 'Producto', almacen: 'Norte'},
  {sku: '002', codigo: 2345678901234, producto: 'Cinta métrica Truper', marca: 'Truper', categoria: 'Herramientas', medida: 'Pieza', precio: 28.50, pos: false, linea: true, estado: false, tipo: 'Producto', almacen: 'Sur'},
  {sku: '003', codigo: 3456789012345, producto: 'Destornillador', marca: 'Truper', categoria: 'Herramientas', medida: 'Pieza', precio: 54.00, pos: true, linea: false, estado: true, tipo: 'Producto', almacen: 'Norte'},
  {sku: '004', codigo: 0, producto: 'Kit ferre', marca: 'Generica', categoria: 'Herramientas', medida: 'Kit', precio: 123.00, pos: false, linea: true, estado: true, tipo: 'Kit', almacen: 'Norte'},
  {sku: '005', codigo: 5678901234567, producto: 'Martillo Truper', marca: 'Truper', categoria: 'Herramientas', medida: 'Pieza', precio: 19.95, pos: true, linea: false, estado: false, tipo: 'Producto', almacen: 'Sur'},
  {sku: '006', codigo: 678901234678, producto: 'Plafón Redondo', marca: 'Generica', categoria: 'Iluminación', medida: 'Pieza', precio: 8.75, pos: false, linea: true, estado: true, tipo: 'Producto', almacen: 'Norte'},
];

@Component({
  selector: 'app-products',
  imports: [...SHARED_IMPORTS, AsyncPipe, MatPaginatorModule, MatMenuModule], // <-- Añadido MatMenuModule aquí
  templateUrl: './products.html',
  styleUrl: './products.css', 
})
export class Products implements OnInit, AfterViewInit {
  
  constructor(private dialog: MatDialog) {}
  
  displayedColumns: string[] = ['sku', 'codigo', 'producto', 'marca', 'categoria', 'medida', 'precio', 'pos', 'linea', 'estado', 'acciones'];
  dataSource = new MatTableDataSource(ELEMENT_DATA);

  currentSearch: string = '';
  currentAlmacen: string = '';
  currentSort: string = ''; 

  filtrosAvanzados = { categoria: '', marca: '', tipo: '', conCodigo: null as boolean | null, visible: null as boolean | null };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  obs!: Observable<any>; 

  ngOnInit() {
    this.dataSource.filterPredicate = (data: PeriodicElement, filter: string) => {
      if (!filter) return true;
      
      let search;
      try {
        search = JSON.parse(filter);
      } catch (e) {
        return true;
      }
      
      const textMatch = !search.text || data.producto.toLowerCase().includes(search.text) || data.sku.toLowerCase().includes(search.text) || data.codigo.toString().includes(search.text);
      const almacenMatch = !search.almacen || data.almacen === search.almacen;
      
      const catMatch = !search.adv?.categoria || data.categoria === search.adv.categoria;
      const marcaMatch = !search.adv?.marca || data.marca === search.adv.marca;
      const tipoMatch = !search.adv?.tipo || data.tipo === search.adv.tipo;
      
      const codigoMatch = search.adv?.conCodigo === null || search.adv?.conCodigo === undefined || (search.adv.conCodigo ? data.codigo > 0 : data.codigo === 0);
      const visibleMatch = search.adv?.visible === null || search.adv?.visible === undefined || data.linea === search.adv.visible;

      return textMatch && almacenMatch && catMatch && marcaMatch && tipoMatch && codigoMatch && visibleMatch;
    };
    
    this.dataSource.filter = JSON.stringify({ 
      text: '', 
      almacen: '', 
      adv: { categoria: '', marca: '', tipo: '', conCodigo: null, visible: null } 
    });

    this.obs = this.dataSource.connect();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  applyFilter() {
    this.dataSource.filter = JSON.stringify({
      text: this.currentSearch.trim().toLowerCase(),
      almacen: this.currentAlmacen,
      adv: this.filtrosAvanzados
    });
  }

  setAlmacen(almacen: string) {
    this.currentAlmacen = almacen;
    this.applyFilter();
  }

  setSort(sortType: string) {
    this.currentSort = sortType;
    const dataCopy = [...this.dataSource.data];

    if (sortType === 'A - Z') {
      dataCopy.sort((a, b) => a.producto.localeCompare(b.producto));
    } else if (sortType === 'Z - A') {
      dataCopy.sort((a, b) => b.producto.localeCompare(a.producto));
    } else if (sortType === 'Más recientes') {
      dataCopy.sort((a, b) => b.sku.localeCompare(a.sku)); 
    }

    this.dataSource.data = dataCopy;
  }
  
  abrirFiltros() {
    const dialogRef = this.dialog.open(Filtro, {
      width: '550px',
      panelClass: 'custom-dialog',
      data: { filtros: this.filtrosAvanzados } 
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.filtrosAvanzados = result; 
        this.applyFilter(); 
      }
    });
  }

  abrirAgregar() {
    const dialogRef = this.dialog.open(ProductD, {
      width: '700px',
      panelClass: 'custom-dialog',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      this.dataSource.data = [
        result,
        ...this.dataSource.data
      ];
    });
  }

  editar(producto: PeriodicElement) {
    const dialogRef = this.dialog.open(ProductD, {
      width: '700px',
      panelClass: 'custom-dialog',
      data: { mode: 'edit', product: producto }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      const index = this.dataSource.data.findIndex(p => p.sku === producto.sku);
      if (index !== -1) {
        this.dataSource.data[index] = result;
        this.dataSource.data = [...this.dataSource.data];
      }
    });
  }

  eliminar(producto: PeriodicElement) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Eliminar producto',
        message: `¿Deseas eliminar "${producto.producto}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      this.dataSource.data = this.dataSource.data.filter(p => p.sku !== producto.sku);
    });
  }
}