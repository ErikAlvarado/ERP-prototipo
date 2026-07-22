import { Component, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../shared/imports/shared-imports';
import { CatalogoProductos, OpcionesProducto, ProductoCatalogo } from '../../../../shared/services/catalogo-productos';
import { ProductD } from '../dialogs/product-d/product-d';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-product-detail',
  imports: [...SHARED_IMPORTS, CurrencyPipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  producto?: ProductoCatalogo;
  private productos: ProductoCatalogo[] = [];
  private opciones: OpcionesProducto = { empresas: [], categorias: [], marcas: [], unidades: [] };

  constructor(private route: ActivatedRoute, private router: Router, private catalogo: CatalogoProductos, private dialog: MatDialog) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.catalogo.cargar().subscribe(productos => { this.productos = productos; this.producto = productos.find(producto => producto.id === id); });
    this.catalogo.cargarOpciones().subscribe(opciones => this.opciones = opciones);
  }

  volver(): void { this.router.navigate(['/products']); }
  editar(): void {
    if (!this.producto) return;
    this.dialog.open(ProductD, {
      width: '760px',
      maxWidth: '96vw',
      panelClass: 'custom-dialog',
      data: { mode: 'edit', product: this.producto, opciones: this.opciones, productos: this.productos },
    }).afterClosed().subscribe(resultado => {
      if (!resultado || !this.producto) return;
      this.productos = this.productos.map(producto => producto.id === this.producto!.id ? { ...producto, ...resultado } : producto);
      this.catalogo.guardar(this.productos);
      this.producto = this.productos.find(producto => producto.id === this.producto!.id);
    });
  }
  eliminar(): void {
    if (!this.producto) return;
    this.dialog.open(ConfirmDialog, { width: '400px', data: { title: 'Eliminar producto', message: `¿Deseas eliminar "${this.producto.producto}"?`, confirmText: 'Eliminar', cancelText: 'Cancelar' } }).afterClosed().subscribe(confirmado => {
      if (!confirmado || !this.producto) return;
      this.catalogo.guardar(this.productos.filter(producto => producto.id !== this.producto!.id));
      this.volver();
    });
  }
}
