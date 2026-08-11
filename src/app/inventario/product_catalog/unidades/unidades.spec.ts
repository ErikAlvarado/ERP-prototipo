import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DatosDb } from '../../../shared/services/datos-db';
import { CatalogoProductos } from '../../../shared/services/catalogo-productos';
import { AdministracionDatos } from '../../administracion/administracion-datos';
import { Unidades } from './unidades';

describe('Unidades', () => {
  let component: Unidades;
  let fixture: ComponentFixture<Unidades>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Unidades],
      providers: [
        { provide: DatosDb, useValue: { leer: () => of([]) } },
        { provide: CatalogoProductos, useValue: { cargar: () => of([]) } },
        {
          provide: AdministracionDatos,
          useValue: {
            cargar: () => of({
              empresas: [],
              almacenes: [],
              roles: [],
              usuarios: [],
              permisos: [],
              usuarioRoles: [],
              rolesPermisos: [],
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Unidades);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
