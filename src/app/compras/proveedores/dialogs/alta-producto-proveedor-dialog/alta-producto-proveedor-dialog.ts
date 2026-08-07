import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatSnackBar,
} from '../../../../shared/material/importaciones-material';
import {
  NuevoProductoProveedorCompra,
  ProductoCompra,
  ProveedorCompra,
  CatalogoCompras,
} from '../../../../shared/services/catalogo-compras';
import {
  CatalogoProductos,
  OpcionProducto,
  OpcionesProducto,
  ProductoCatalogo,
} from '../../../../shared/services/catalogo-productos';
import {
  AdministracionDatos,
  AlmacenAdministracion,
} from '../../../../inventario/administracion/administracion-datos';

export interface DatosAltaProductoProveedorDialog {
  proveedor: ProveedorCompra;
}

interface OpcionAlmacen {
  id: number;
  idEmpresa: number;
  nombre: string;
}

type InventarioForm = FormGroup<{
  idAlmacen: FormControl<number>;
  stock: FormControl<number>;
  stockReorden: FormControl<number>;
  stockCritico: FormControl<number>;
  stockMaximo: FormControl<number>;
  anaquel: FormControl<string>;
}>;

const OPCIONES_VACIAS: OpcionesProducto = {
  empresas: [],
  categorias: [],
  marcas: [],
  unidades: [],
  listasPrecios: [],
};

@Component({
  selector: 'app-alta-producto-proveedor-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  templateUrl: './alta-producto-proveedor-dialog.html',
  styleUrl: './alta-producto-proveedor-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AltaProductoProveedorDialog implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly catalogoCompras = inject(CatalogoCompras);
  private readonly catalogoProductos = inject(CatalogoProductos);
  private readonly administracion = inject(AdministracionDatos);
  private readonly referencia = inject(
    MatDialogRef<AltaProductoProveedorDialog, ProductoCompra>,
  );
  private readonly avisos = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly datos = inject<DatosAltaProductoProveedorDialog>(MAT_DIALOG_DATA);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly errorCarga = signal('');
  readonly errorFormulario = signal('');
  readonly opciones = signal<OpcionesProducto>(OPCIONES_VACIAS);
  readonly almacenes = signal<OpcionAlmacen[]>([]);

  private productosExistentes: ProductoCatalogo[] = [];

  readonly formulario = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(160)]],
    sku: ['', [Validators.required, Validators.maxLength(60)]],
    codigo: ['', Validators.maxLength(80)],
    descripcion: ['', Validators.maxLength(500)],
    tipo: ['Físico', Validators.required],
    idEmpresa: [0, Validators.min(1)],
    idMarca: [0, Validators.min(1)],
    idCategoria: [0, Validators.min(1)],
    idUnidad: [0, Validators.min(1)],
    estatus: ['Vigente', Validators.required],
    ubicacionDefault: ['', Validators.maxLength(120)],
    claveSat: ['', Validators.maxLength(30)],
    costo: [0, Validators.min(0)],
    precio: [0, Validators.min(0)],
    skuProveedor: ['', [Validators.required, Validators.maxLength(80)]],
    precioReferencia: [0, [Validators.required, Validators.min(0.01)]],
    diasEntrega: [1, [Validators.required, Validators.min(0)]],
    cantidadMinima: [1, [Validators.required, Validators.min(1)]],
    pos: true,
    linea: false,
    requiereReceta: false,
    usarExistencias: true,
    inventarios: new FormArray<InventarioForm>([]),
  });

  get inventarios(): FormArray<InventarioForm> {
    return this.formulario.controls.inventarios;
  }

  get marcasDisponibles(): OpcionProducto[] {
    return this.opcionesEmpresa(this.opciones().marcas);
  }

  get categoriasDisponibles(): OpcionProducto[] {
    return this.opcionesEmpresa(this.opciones().categorias);
  }

  get unidadesDisponibles(): OpcionProducto[] {
    return this.opcionesEmpresa(this.opciones().unidades);
  }

  get almacenesDisponibles(): OpcionAlmacen[] {
    const empresa = Number(this.formulario.controls.idEmpresa.value);
    return this.almacenes().filter(almacen => almacen.idEmpresa === empresa);
  }

  ngOnInit(): void {
    combineLatest({
      opciones: this.catalogoProductos.cargarOpciones(),
      productos: this.catalogoProductos.cargar(),
      administracion: this.administracion.cargar(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ opciones, productos, administracion }) => {
          this.opciones.set({
            ...opciones,
            empresas: administracion.empresas
              .filter(empresa => empresa.estado)
              .map(empresa => ({
                id: Number(empresa.id),
                idEmpresa: Number(empresa.id),
                nombre: empresa.nombre,
              })),
          });
          this.almacenes.set(
            administracion.almacenes
              .filter(almacen => almacen.estado)
              .map(almacen => this.mapearAlmacen(almacen)),
          );
          this.productosExistentes = productos;
          this.inicializarFormulario();
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set(
            'No fue posible cargar empresas, clasificaciones y almacenes.',
          );
          this.cargando.set(false);
        },
      });
  }

  cambiarEmpresa(): void {
    this.asignarPrimerasOpciones();
    this.inventarios.clear();
    if (this.formulario.controls.usarExistencias.value) {
      this.agregarInventario();
    }
  }

  agregarInventario(): void {
    const usados = new Set(
      this.inventarios.controls.map(control => control.controls.idAlmacen.value),
    );
    const almacen = this.almacenesDisponibles.find(item => !usados.has(item.id));
    if (!almacen) {
      this.errorFormulario.set(
        this.almacenesDisponibles.length
          ? 'Ya agregaste todos los almacenes disponibles para esta empresa.'
          : 'La empresa seleccionada no tiene almacenes activos.',
      );
      return;
    }
    this.errorFormulario.set('');
    this.inventarios.push(this.crearInventario(almacen.id));
  }

  quitarInventario(indice: number): void {
    if (this.inventarios.length <= 1) return;
    this.inventarios.removeAt(indice);
  }

  almacenesParaFila(indice: number): OpcionAlmacen[] {
    const actual = this.inventarios.at(indice)?.controls.idAlmacen.value;
    const usados = new Set(
      this.inventarios.controls
        .map(control => control.controls.idAlmacen.value)
        .filter(id => id !== actual),
    );
    return this.almacenesDisponibles.filter(almacen => !usados.has(almacen.id));
  }

  cancelar(): void {
    this.referencia.close();
  }

  async guardar(): Promise<void> {
    if (this.guardando()) return;
    this.errorFormulario.set('');
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) {
      this.errorFormulario.set('Completa los campos obligatorios y corrige los valores.');
      return;
    }
    const error = this.validarDatos();
    if (error) {
      this.errorFormulario.set(error);
      return;
    }

    const valor = this.formulario.getRawValue();
    const nuevo: NuevoProductoProveedorCompra = {
      idEmpresa: Number(valor.idEmpresa),
      sku: valor.sku.trim(),
      codigo: valor.codigo.trim(),
      nombre: valor.nombre.trim(),
      descripcion: valor.descripcion.trim(),
      tipo: valor.tipo.trim(),
      idMarca: Number(valor.idMarca),
      idCategoria: Number(valor.idCategoria),
      idUnidad: Number(valor.idUnidad),
      estatus: valor.estatus,
      ubicacionDefault: valor.ubicacionDefault.trim(),
      claveSat: valor.claveSat.trim(),
      pos: valor.pos,
      linea: valor.linea,
      requiereReceta: valor.requiereReceta,
      usarExistencias: valor.usarExistencias,
      costo: Number(valor.costo),
      precio: Number(valor.precio),
      inventarios: valor.inventarios.map(inventario => ({
        idAlmacen: Number(inventario.idAlmacen),
        stock: Number(inventario.stock),
        stockReorden: Number(inventario.stockReorden),
        stockCritico: Number(inventario.stockCritico),
        stockMaximo: Number(inventario.stockMaximo),
        anaquel: inventario.anaquel.trim(),
      })),
      skuProveedor: valor.skuProveedor.trim(),
      precioReferencia: Number(valor.precioReferencia),
      diasEntrega: Number(valor.diasEntrega),
      cantidadMinima: Number(valor.cantidadMinima),
    };

    try {
      this.guardando.set(true);
      const producto = await this.catalogoCompras.registrarProductoProveedor(
        this.datos.proveedor.id,
        nuevo,
      );
      this.avisos.open(
        `${producto.nombre} fue creado y vinculado con ${this.datos.proveedor.nombre}.`,
        'Cerrar',
        { duration: 4000 },
      );
      this.referencia.close(producto);
    } catch (errorRegistro) {
      this.errorFormulario.set(
        errorRegistro instanceof Error
          ? errorRegistro.message
          : 'No fue posible registrar el producto.',
      );
    } finally {
      this.guardando.set(false);
    }
  }

  private inicializarFormulario(): void {
    const empresa = this.opciones().empresas[0];
    this.formulario.patchValue({ idEmpresa: empresa?.id || 0 });
    this.asignarPrimerasOpciones();
    this.agregarInventario();
  }

  private asignarPrimerasOpciones(): void {
    this.formulario.patchValue({
      idMarca: this.marcasDisponibles[0]?.id || 0,
      idCategoria: this.categoriasDisponibles[0]?.id || 0,
      idUnidad: this.unidadesDisponibles[0]?.id || 0,
    });
  }

  private opcionesEmpresa(opciones: OpcionProducto[]): OpcionProducto[] {
    const empresa = Number(this.formulario.controls.idEmpresa.value);
    return opciones.filter(opcion => opcion.idEmpresa === empresa);
  }

  private crearInventario(idAlmacen: number): InventarioForm {
    return new FormGroup({
      idAlmacen: new FormControl(idAlmacen, {
        nonNullable: true,
        validators: Validators.min(1),
      }),
      stock: new FormControl(1, {
        nonNullable: true,
        validators: Validators.min(0.01),
      }),
      stockReorden: new FormControl(1, {
        nonNullable: true,
        validators: Validators.min(0),
      }),
      stockCritico: new FormControl(0, {
        nonNullable: true,
        validators: Validators.min(0),
      }),
      stockMaximo: new FormControl(1, {
        nonNullable: true,
        validators: Validators.min(0),
      }),
      anaquel: new FormControl('', {
        nonNullable: true,
        validators: Validators.maxLength(80),
      }),
    });
  }

  private validarDatos(): string {
    const valor = this.formulario.getRawValue();
    const sku = this.normalizar(valor.sku);
    const codigo = this.normalizar(valor.codigo);
    if (this.productosExistentes.some(producto => this.normalizar(producto.sku) === sku)) {
      return 'Ya existe un producto con ese SKU.';
    }
    if (
      codigo
      && this.productosExistentes.some(
        producto => this.normalizar(producto.codigo) === codigo,
      )
    ) {
      return 'Ya existe un producto con ese código de barras.';
    }
    if (!this.marcasDisponibles.some(opcion => opcion.id === Number(valor.idMarca))) {
      return 'La marca debe pertenecer a la empresa seleccionada.';
    }
    if (!this.categoriasDisponibles.some(opcion => opcion.id === Number(valor.idCategoria))) {
      return 'La categoría debe pertenecer a la empresa seleccionada.';
    }
    if (!this.unidadesDisponibles.some(opcion => opcion.id === Number(valor.idUnidad))) {
      return 'La unidad debe pertenecer a la empresa seleccionada.';
    }
    if (valor.precio > 0 && valor.precio < valor.costo) {
      return 'El precio de venta no puede ser menor que el costo.';
    }
    if (valor.usarExistencias && !valor.inventarios.length) {
      return 'Agrega al menos un almacén para controlar existencias.';
    }
    const ids = valor.inventarios.map(inventario => Number(inventario.idAlmacen));
    if (new Set(ids).size !== ids.length) {
      return 'No puedes registrar dos inventarios para el mismo almacén.';
    }
    for (const inventario of valor.inventarios) {
      if (inventario.stock <= 0) {
        return 'El stock inicial debe ser mayor que cero.';
      }
      if (inventario.stockCritico > inventario.stockReorden) {
        return 'El stock crítico no puede superar el punto de reorden.';
      }
      if (inventario.stockReorden > inventario.stockMaximo) {
        return 'El punto de reorden no puede superar el stock máximo.';
      }
      if (inventario.stock > inventario.stockMaximo) {
        return 'El stock inicial no puede superar el stock máximo.';
      }
    }
    return '';
  }

  private mapearAlmacen(almacen: AlmacenAdministracion): OpcionAlmacen {
    return {
      id: Number(almacen.id),
      idEmpresa: Number(almacen.empresaId),
      nombre: almacen.nombre,
    };
  }

  private normalizar(valor: string): string {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-MX')
      .trim();
  }
}
