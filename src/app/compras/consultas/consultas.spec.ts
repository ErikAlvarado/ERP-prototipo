import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Consultas } from './consultas';

describe('Consultas', () => {
  let component: Consultas;
  let fixture: ComponentFixture<Consultas>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Consultas],
    }).compileComponents();

    fixture = TestBed.createComponent(Consultas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('selecciona una orden y actualiza el detalle', () => {
    const orden = component.pedidosActivos()[2];

    component.seleccionarOrden(orden);

    expect(component.detalleOrden()).toBe(orden);
  });

  it('precalcula los pedidos activos y la clase de estado', () => {
    component.periodo.set('semana');

    expect(component.pedidosActivos()).toHaveLength(7);
    expect(component.pedidosActivos().some((orden) =>
      orden.folio === 'OC-2025-0090')).toBe(true);
    expect(component.ordenesSeguimiento()).toHaveLength(4);
    expect(component.ordenesSeguimiento().every((orden) =>
      orden.estado === 'Activo' || orden.estado === 'En transito')).toBe(true);
  });

  it('limita el historial a compras completadas', () => {
    component.periodo.set('anio');

    expect(component.ordenesFiltradas().length).toBeGreaterThan(0);
    expect(component.ordenesFiltradas().every((orden) =>
      orden.estado === 'Completado')).toBe(true);
    expect(component.ordenesFiltradas().some((orden) =>
      orden.estado === 'En transito')).toBe(false);
  });
});
