import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { EncabezadoPagina } from '../../shared/components/encabezado-pagina/encabezado-pagina';
import {
  IMPORTACIONES_MATERIAL_PROVEEDORES,
  MatDialog,
  MatSnackBar,
} from '../../shared/material/importaciones-material';
import { Autenticacion } from '../../shared/services/autenticacion';
import {
  CatalogoCompras,
  ProductoCompra,
  ProveedorCompra,
} from '../../shared/services/catalogo-compras';
import {
  OrdenCompra,
  OrdenesCompraService,
} from '../services/ordenes-compra.service';
import {
  CompraProveedorDialog,
  CompraRegistrada,
  DatosCompraProveedorDialog,
} from './dialogs/compra-proveedor-dialog/compra-proveedor-dialog';
import {
  AltaProductoProveedorDialog,
  DatosAltaProductoProveedorDialog,
} from './dialogs/alta-producto-proveedor-dialog/alta-producto-proveedor-dialog';
import {
  NuevoProveedor,
  NuevoProveedorDialog,
} from './dialogs/nuevo-proveedor-dialog/nuevo-proveedor-dialog';

@Component({
  selector: 'app-proveedores',
  imports: [
    EncabezadoPagina,
    IMPORTACIONES_MATERIAL_PROVEEDORES,
  ],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Proveedores {
  private readonly dialogo = inject(MatDialog);
  private readonly avisos = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly catalogo = inject(CatalogoCompras);
  private readonly ordenesCompra = inject(OrdenesCompraService);
  private readonly autenticacion = inject(Autenticacion);

  readonly terminoBusqueda = signal(
    this.route.snapshot.queryParamMap.get('buscar') || '',
  );
  readonly proveedores = this.catalogo.proveedores;
  readonly cargando = this.catalogo.cargando;
  readonly guardandoTxt = this.catalogo.guardandoTxt;
  readonly errorCarga = this.catalogo.errorCarga;
  readonly proveedoresActivos = computed(() =>
    this.proveedores().filter(proveedor => proveedor.activo).length,
  );
  readonly proveedoresFiltrados = computed(() => {
    const termino = this.normalizar(this.terminoBusqueda());
    if (!termino) return this.proveedores();
    return this.proveedores().filter(proveedor => {
      const productos = this.catalogo.productosDeProveedor(proveedor.id)
        .map(producto =>
          `${producto.nombre} ${producto.sku} ${producto.codigo}`)
        .join(' ');
      return this.normalizar(
        `${proveedor.nombre} ${proveedor.razonSocial} ${proveedor.rfc} `
        + `${proveedor.categoria} ${proveedor.contacto} ${proveedor.correo} `
        + productos,
      ).includes(termino);
    });
  });

  buscar(valor: string): void {
    this.terminoBusqueda.set(valor);
  }

  reintentarCarga(): void {
    this.catalogo.recargar();
  }

  abrirNuevoProveedor(): void {
    this.dialogo
      .open<NuevoProveedorDialog, void, NuevoProveedor>(NuevoProveedorDialog, {
        width: '505px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        panelClass: 'dialogo-nuevo-proveedor',
      })
      .afterClosed()
      .subscribe(async nuevoProveedor => {
        if (!nuevoProveedor) return;
        try {
          const proveedor = await this.catalogo.registrarProveedor(nuevoProveedor);
          this.avisos.open(
            'Proveedor registrado. Ahora agrega su primer producto.',
            'Cerrar',
            { duration: 3500 },
          );
          this.agregarProducto(proveedor);
        } catch (error) {
          this.avisos.open(
            error instanceof Error ? error.message : 'No fue posible registrar el proveedor.',
            'Cerrar',
            { duration: 4500 },
          );
        }
      });
  }

  agregarProducto(proveedor: ProveedorCompra): void {
    if (!proveedor.activo) {
      this.avisos.open(
        'Reactiva el proveedor antes de agregar productos.',
        'Cerrar',
        { duration: 3500 },
      );
      return;
    }
    const data: DatosAltaProductoProveedorDialog = { proveedor };
    this.dialogo.open<
      AltaProductoProveedorDialog,
      DatosAltaProductoProveedorDialog,
      ProductoCompra
    >(AltaProductoProveedorDialog, {
      data,
      width: '1080px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: '96vh',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
  }

  confirmarCambioEstado(proveedor: ProveedorCompra): void {
    const activar = !proveedor.activo;
    this.dialogo
      .open(ConfirmDialog, {
        width: '450px',
        maxWidth: 'calc(100vw - 32px)',
        data: {
          title: activar
            ? `Reactivar ${proveedor.nombre}`
            : `Dar de baja a ${proveedor.nombre}`,
          message: activar
            ? 'El proveedor volverá a estar disponible para compras y administración de productos.'
            : 'El proveedor quedará inactivo para nuevas compras. Sus órdenes y vínculos históricos se conservarán.',
          confirmText: activar ? 'Reactivar proveedor' : 'Dar de baja',
          cancelText: 'Cancelar',
        },
      })
      .afterClosed()
      .subscribe(async confirmado => {
        if (!confirmado) return;
        try {
          const actualizado = await this.catalogo.cambiarEstadoProveedor(
          proveedor.id,
          activar,
        );
        this.avisos.open(
          `${actualizado.nombre} quedó ${activar ? 'activo' : 'inactivo'}.`,
          'Cerrar',
          { duration: 3000 },
        );
        } catch (error) {
          this.avisos.open(
            error instanceof Error
              ? error.message
              : 'No fue posible guardar el estado del proveedor.',
            'Cerrar',
            { duration: 5000 },
          );
        }
      });
  }

  realizarCompra(proveedor: ProveedorCompra): void {
    if (!proveedor.activo) {
      this.avisos.open('Reactiva el proveedor antes de comprar.', 'Cerrar', {
        duration: 3500,
      });
      return;
    }
    const productos = this.catalogo.productosDeProveedor(proveedor.id);
    if (!productos.length) {
      this.avisos.open(
        'Vincula al menos un producto antes de realizar la compra.',
        'Cerrar',
        { duration: 4000 },
      );
      return;
    }
    const almacenes = this.catalogo.almacenes();
    if (!almacenes.length) {
      this.avisos.open(
        'No hay almacenes activos disponibles en Inventario.',
        'Cerrar',
        { duration: 4000 },
      );
      return;
    }

    const data: DatosCompraProveedorDialog = {
      proveedor: {
        ...proveedor,
        ...this.resumenUltimaCompra(proveedor),
      },
      productos,
      almacenes,
    };
    this.dialogo
      .open<CompraProveedorDialog, DatosCompraProveedorDialog, CompraRegistrada>(
        CompraProveedorDialog,
        {
          data,
          width: '1120px',
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: '96vh',
          autoFocus: false,
          restoreFocus: true,
        },
      )
      .afterClosed()
      .subscribe(compra => {
        if (!compra) return;
        this.registrarOrdenes(proveedor, compra);
      });
  }

  ultimaCompra(proveedor: ProveedorCompra): { fecha: string; total: string } {
    const resumen = this.resumenUltimaCompra(proveedor);
    return {
      fecha: resumen.ultimaCompra,
      total: resumen.totalCompra,
    };
  }

  private registrarOrdenes(
    proveedor: ProveedorCompra,
    compra: CompraRegistrada,
  ): void {
    try {
      const solicitante =
        this.autenticacion.sesion()?.nombre || 'Usuario de Compras';
      const ordenes = this.ordenesCompra.crearLote(
        compra.destinos.map(destino => ({
          proveedor: proveedor.nombre,
          solicitante,
          almacenId: destino.almacenId,
          almacen: destino.almacen,
          partidas: destino.partidas,
          fecha: this.formatearFecha(compra.fecha),
          fechaEntrega: compra.fechaEntrega,
          condiciones: 'Contado' as const,
          estadoInicial: 'Activo' as const,
        })),
      );
      const folios = ordenes.map(orden => orden.folio).join(', ');
      this.avisos.open(
        `${ordenes.length === 1 ? 'Orden creada' : 'Órdenes creadas'}: ${folios}. Ya disponible en Gestión de compras.`,
        'Cerrar',
        { duration: 5500 },
      );
    } catch (error) {
      this.avisos.open(
        error instanceof Error ? error.message : 'No fue posible registrar la compra.',
        'Cerrar',
        { duration: 5000 },
      );
    }
  }

  private resumenUltimaCompra(
    proveedor: ProveedorCompra,
  ): { ultimaCompra: string; totalCompra: string } {
    const orden = [...this.ordenesCompra.ordenes()]
      .filter(item =>
        this.normalizar(item.proveedor) === this.normalizar(proveedor.nombre))
      .sort((a, b) =>
        b.actualizadaEn.localeCompare(a.actualizadaEn)
        || b.fecha.localeCompare(a.fecha))[0];
    return orden
      ? {
          ultimaCompra: this.formatearFechaVisible(orden),
          totalCompra: orden.total,
        }
      : {
          ultimaCompra: proveedor.ultimaCompra,
          totalCompra: proveedor.totalCompra,
        };
  }

  private formatearFechaVisible(orden: OrdenCompra): string {
    const fecha = new Date(orden.fecha);
    if (Number.isNaN(fecha.getTime())) return orden.fecha;
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(fecha);
  }

  private formatearFecha(fecha: Date): string {
    const valor = new Date(fecha);
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-MX')
      .trim();
  }
}
