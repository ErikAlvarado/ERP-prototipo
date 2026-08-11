import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CatalogoCompras } from '../../shared/services/catalogo-compras';
import { Catalogos } from './catalogos';

describe('Catalogos', () => {
  let component: Catalogos;
  let fixture: ComponentFixture<Catalogos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Catalogos],
      providers: [
        provideRouter([]),
        {
          provide: CatalogoCompras,
          useValue: {
            productos: signal([]),
            categorias: signal(['Tecnología', 'Papelería']),
            alternarFavorito: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Catalogos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('crea las categorías desde el catálogo real', () => {
    expect(component.categorias().map(item => item.etiqueta)).toEqual([
      'Todos',
      'Tecnología',
      'Papelería',
    ]);
  });
});
