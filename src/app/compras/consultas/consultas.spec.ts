import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Consultas } from './consultas';

describe('Consultas', () => {
  let component: Consultas;
  let fixture: ComponentFixture<Consultas>;

  beforeEach(async () => {
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
    const orden = component.ordenes[2];

    component.seleccionarOrden(orden);

    expect(component.detalleOrden()).toBe(orden);
  });

  it('precalcula los pedidos activos y la clase de estado', () => {
    component.periodo.set('anio');

    expect(component.pedidosActivos()).toHaveLength(5);
    expect(component.ordenes[1].estadoClase).toBe('en-tránsito');
  });
});
