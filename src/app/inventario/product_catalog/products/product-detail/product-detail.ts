import { Component, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { SHARED_IMPORTS } from '../../../../shared/imports/shared-imports';
import { CatalogoProductos, OpcionesProducto, ProductoCatalogo } from '../../../../shared/services/catalogo-productos';
import { ProductD } from '../dialogs/product-d/product-d';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { switchMap } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EstatusProducto } from '../../../../shared/components/estatus-producto/estatus-producto';

@Component({
  selector: 'app-product-detail',
  imports: [...SHARED_IMPORTS, CurrencyPipe, MatProgressSpinnerModule, EstatusProducto],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  producto?: ProductoCatalogo;
  cargando = true;
  errorCarga = '';
  imagenNoDisponible = false;
  private productos: ProductoCatalogo[] = [];
  private opciones: OpcionesProducto = { empresas: [], categorias: [], marcas: [], unidades: [] };

  constructor(private route: ActivatedRoute, private router: Router, private catalogo: CatalogoProductos, private dialog: MatDialog) {}

  ngOnInit(): void {
    const productoNavegacion = history.state?.producto as ProductoCatalogo | undefined;
    if (productoNavegacion) this.producto = productoNavegacion;

    this.route.paramMap.pipe(
      switchMap(parametros => {
        const id = Number(parametros.get('id'));
        this.cargando = true;
        this.errorCarga = '';
        return this.catalogo.cargar().pipe(
          switchMap(productos => {
            this.productos = productos;
            this.producto = productos.find(producto => Number(producto.id) === id);
            this.imagenNoDisponible = false;
            this.cargando = false;
            return this.catalogo.cargarOpciones();
          }),
        );
      }),
    ).subscribe({
      next: opciones => this.opciones = opciones,
      error: () => {
        this.cargando = false;
        this.errorCarga = 'No fue posible cargar la información del producto.';
      },
    });
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
      const eliminado: ProductoCatalogo = {
        ...this.producto,
        estatus: 'Eliminado',
        estado: false,
        fechaActualizacion: new Date().toISOString().slice(0, 10),
      };
      this.productos = this.productos.map(producto => producto.id === eliminado.id ? eliminado : producto);
      this.catalogo.guardar(this.productos);
      this.producto = eliminado;
    });
  }
}
