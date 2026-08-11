import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';

import { Dashboard } from './dashboard';
import { CatalogoProductos, ProductoCatalogo } from '../../shared/services/catalogo-productos';
import { ContextoInventario, GestionInventario } from '../inventario/gestion-inventario';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let contexto$: Subject<ContextoInventario>;
  let productos$: Subject<ProductoCatalogo[]>;

  beforeEach(async () => {
    contexto$ = new Subject<ContextoInventario>();
    productos$ = new Subject<ProductoCatalogo[]>();
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: GestionInventario,
          useValue: {
            cargar: () => contexto$,
            comprometeStockTransferencia: () => false,
            cantidadComprometida: () => 0,
          },
        },
        {
          provide: CatalogoProductos,
          useValue: { cargar: () => productos$ },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe mostrar los datos cuando terminan de cargar asincronamente', async () => {
    contexto$.next({
      productos: [{
        id: 1,
        idEmpresa: 1,
        sku: 'SKU-ASYNC',
        nombre: 'Producto cargado',
        unidad: 'pieza',
        permiteDecimales: false,
      }],
      almacenes: [],
      usuarios: [],
      estadosTransferencia: [],
      existencias: [{
        id: '1',
        productoId: 1,
        almacenId: 1,
        idAnaquel: 1,
        sku: 'SKU-ASYNC',
        producto: 'Producto cargado',
        unidad: 'pieza',
        almacen: 'Almacen central',
        stock: 12,
        reorden: 4,
        critico: 2,
        maximo: 20,
        anaquel: 'A-1',
        actualizacion: '2026-07-24',
        inicializada: true,
      }],
      movimientos: [],
      ajustes: [],
      transferencias: [],
    });
    productos$.next([{
      id: 1,
      estado: true,
      precio: 100,
      costo: 60,
    } as ProductoCatalogo]);

    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Producto cargado');
    expect(fixture.nativeElement.textContent).toContain('12 pieza');
  });
});
