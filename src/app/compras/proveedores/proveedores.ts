import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IMPORTACIONES_MATERIAL_PROVEEDORES,
  MatDialog,
  MatSnackBar,
} from '../../shared/material/importaciones-material';
import { Card } from '../../shared/components/card/card';
import { EncabezadoPagina } from '../../shared/components/encabezado-pagina/encabezado-pagina';
import { Estado } from '../../shared/components/estado/estado';
import {
  NuevoProveedor,
  NuevoProveedorDialog,
} from './dialogs/nuevo-proveedor-dialog/nuevo-proveedor-dialog';
import {
  CompraProveedorDialog,
  CompraRegistrada,
} from './dialogs/compra-proveedor-dialog/compra-proveedor-dialog';

interface Proveedor {
  inicial: string;
  nombre: string;
  razonSocial: string;
  direccionFiscal: string;
  categoria: string;
  contacto: string;
  correo: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
  calificacion: number;
  ultimaCompra: string;
  totalCompra: string;
  tiempoSurtido: string;
  unidadCompra: string;
  diasLimiteCancelacion: number;
}

@Component({
  selector: 'app-proveedores',
  imports: [
    Card,
    EncabezadoPagina,
    Estado,
    IMPORTACIONES_MATERIAL_PROVEEDORES,
  ],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Proveedores {
  private readonly dialogo = inject(MatDialog);
  private readonly notificacion = inject(MatSnackBar);
  readonly terminoBusqueda = signal('');

  readonly proveedores = signal<Proveedor[]>([
    {
      inicial: 'T',
      nombre: 'TechnoInsumos SA de CV',
      razonSocial: 'TechnoInsumos SA de CV',
      direccionFiscal: 'Av. Reforma 120, Col. Centro, C.P. 06000, CDMX',
      categoria: 'Tecnologia',
      contacto: 'Ing. Carlos Mendoza',
      correo: 'cmendoza@technoinsumos.mx',
      telefono: '55 4521-7890',
      estado: 'Activo',
      calificacion: 4.8,
      ultimaCompra: '15 Jun 2025',
      totalCompra: '$342,500',
      tiempoSurtido: '7 días hábiles', unidadCompra: 'Pieza', diasLimiteCancelacion: 2,
    },
    {
      inicial: 'G',
      nombre: 'Grupo Distribuidora Nacional',
      razonSocial: 'Grupo Distribuidora Nacional SA de CV',
      direccionFiscal: 'Insurgentes Sur 850, Col. Del Valle, C.P. 03100, CDMX',
      categoria: 'Papeleria',
      contacto: 'Lic. Ana Garcia',
      correo: 'agarcia@gdnacional.mx',
      telefono: '55 3312-4567',
      estado: 'Activo',
      calificacion: 4.2,
      ultimaCompra: '10 Jun 2025',
      totalCompra: '$128,900',
      tiempoSurtido: '3 días hábiles', unidadCompra: 'Caja', diasLimiteCancelacion: 1,
    },
    {
      inicial: 'M',
      nombre: 'Materiales del Norte SA',
      razonSocial: 'Materiales del Norte SA de CV',
      direccionFiscal: 'Av. Industria 450, C.P. 64000, Monterrey, N.L.',
      categoria: 'Industrial',
      contacto: 'Ing. Roberto Salinas',
      correo: 'rsalinas@matnorte.mx',
      telefono: '81 8901-2345',
      estado: 'Activo',
      calificacion: 3.9,
      ultimaCompra: '02 Jun 2025',
      totalCompra: '$890,200',
      tiempoSurtido: '10 días hábiles', unidadCompra: 'Lote', diasLimiteCancelacion: 3,
    },
    {
      inicial: 'E',
      nombre: 'Electronica Empresarial MX',
      razonSocial: 'Electrónica Empresarial de México SA de CV',
      direccionFiscal: 'Eje Central 320, C.P. 03020, CDMX',
      categoria: 'Tecnologia',
      contacto: 'Lic. Patricia Reyes',
      correo: 'preyes@electronica-mx.com',
      telefono: '55 6789-0123',
      estado: 'Activo',
      calificacion: 4.5,
      ultimaCompra: '18 Jun 2025',
      totalCompra: '$675,000',
      tiempoSurtido: '5 días hábiles', unidadCompra: 'Pieza', diasLimiteCancelacion: 2,
    },
    {
      inicial: 'P',
      nombre: 'Papeleria Martinez & Asoc.',
      razonSocial: 'Papelería Martínez y Asociados SA de CV',
      direccionFiscal: 'Av. Vallarta 1800, C.P. 44130, Guadalajara, Jal.',
      categoria: 'Papeleria',
      contacto: 'Sr. Luis Martinez',
      correo: 'lmartinez@papeleria.mx',
      telefono: '33 2345-6789',
      estado: 'Inactivo',
      calificacion: 4.0,
      ultimaCompra: '20 May 2025',
      totalCompra: '$45,600',
      tiempoSurtido: '2 días hábiles', unidadCompra: 'Paquete', diasLimiteCancelacion: 1,
    },
    {
      inicial: 'S',
      nombre: 'Soluciones Logisticas Omega',
      razonSocial: 'Soluciones Logísticas Omega SA de CV',
      direccionFiscal: 'Circuito Logístico 45, C.P. 54940, Tultitlán, Méx.',
      categoria: 'Logistica',
      contacto: 'Dra. Fernanda Lopez',
      correo: 'flopez@omega-log.mx',
      telefono: '55 9876-5432',
      estado: 'Activo',
      calificacion: 4.6,
      ultimaCompra: '17 Jun 2025',
      totalCompra: '$234,800',
      tiempoSurtido: '4 días hábiles', unidadCompra: 'Servicio', diasLimiteCancelacion: 2,
    },
  ]);

  readonly proveedoresFiltrados = computed(() => {
    const termino = this.normalizar(this.terminoBusqueda());
    if (!termino) return this.proveedores();
    return this.proveedores().filter((proveedor) =>
      this.normalizar(`${proveedor.nombre} ${proveedor.razonSocial} ${proveedor.categoria} ${proveedor.contacto} ${proveedor.correo}`).includes(termino),
    );
  });

  buscar(valor: string): void {
    this.terminoBusqueda.set(valor);
  }

  private normalizar(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').trim();
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
      .subscribe((nuevoProveedor) => {
        if (nuevoProveedor) this.agregarProveedor(nuevoProveedor);
      });
  }

  agregarProveedor(nuevoProveedor: NuevoProveedor): void {
    this.proveedores.update((proveedores) => [
      {
        inicial: nuevoProveedor.nombreComercial.trim().charAt(0).toLocaleUpperCase('es-MX'),
        nombre: nuevoProveedor.nombreComercial.trim(),
        razonSocial: nuevoProveedor.razonSocial.trim(),
        direccionFiscal: nuevoProveedor.direccionFiscal.trim(),
        categoria: nuevoProveedor.categoria,
        contacto: nuevoProveedor.contacto.trim() || 'Sin contacto asignado',
        correo: nuevoProveedor.correo.trim(),
        telefono: nuevoProveedor.telefono.trim() || 'Sin teléfono',
        estado: 'Activo',
        calificacion: 0,
        ultimaCompra: 'Sin compras',
        totalCompra: '$0',
        tiempoSurtido: 'Por definir',
        unidadCompra: 'Pieza',
        diasLimiteCancelacion: 1,
      },
      ...proveedores,
    ]);
  }

  realizarCompra(proveedor: Proveedor): void {
    this.dialogo
      .open<CompraProveedorDialog, Proveedor, CompraRegistrada>(CompraProveedorDialog, {
        data: proveedor,
        width: '1050px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: '96vh',
        autoFocus: false,
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((compra) => {
        if (!compra) return;
        this.actualizarCompraProveedor(proveedor.nombre, compra);
        this.notificacion.open(`Compra registrada con ${proveedor.nombre}`, 'Cerrar', {
          duration: 3500,
        });
      });
  }

  private actualizarCompraProveedor(nombre: string, compra: CompraRegistrada): void {
    const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
    const formatoFecha = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    this.proveedores.update((proveedores) =>
      proveedores.map((proveedor) =>
        proveedor.nombre === nombre
          ? { ...proveedor, ultimaCompra: formatoFecha.format(compra.fecha), totalCompra: formatoMoneda.format(compra.total) }
          : proveedor,
      ),
    );
  }
}
