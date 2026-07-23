import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionCompras } from './gestion-compras';

describe('GestionCompras', () => {
  let component: GestionCompras;
  let fixture: ComponentFixture<GestionCompras>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionCompras],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionCompras);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe cancelar una solicitud', () => {
    component.cancelarSolicitud('SC-2025-0234');
    expect(component.solicitudes().find((item) => item.folio === 'SC-2025-0234')?.estado).toBe(
      'Cancelada',
    );
  });

  it('debe cancelar una orden y deshabilitar nuevas cancelaciones', () => {
    component.cancelarOrden('OC-2025-0089');
    const orden = component.ordenes().find((item) => item.folio === 'OC-2025-0089');
    expect(orden?.estado).toBe('Cancelado');
    expect(orden?.cancelable).toBe(false);
  });

  it('debe buscar compras por proveedor', () => {
    component.periodoOrdenes.set('anio');
    component.buscarOrden('materiales del norte');

    expect(component.ordenesFiltradas().map((orden) => orden.folio)).toEqual(['OC-2025-0089']);
  });
});
