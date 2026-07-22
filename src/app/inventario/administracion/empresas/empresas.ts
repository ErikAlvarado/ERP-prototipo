import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { AdministracionDatos, EmpresaAdministracion } from '../administracion-datos';
import { FiltrosAdministracionDialog, ValorFiltroAdministracion } from '../filtros-administracion-dialog/filtros-administracion-dialog';
import { EmpresasDialog } from './dialogs/empresas-dialog/empresas-dialog';

@Component({
  selector: 'app-empresas',
  imports: [...SHARED_IMPORTS, AsyncPipe, MatPaginatorModule],
  templateUrl: './empresas.html',
  styleUrls: ['../administracion-listas.css'],
})
export class Empresas implements OnInit, AfterViewInit {
  displayedColumns = ['clave', 'empresa', 'razonSocial', 'rfc', 'contacto', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<EmpresaAdministracion>([]);
  obs!: Observable<EmpresaAdministracion[]>;
  currentSearch = '';
  currentStatus: boolean | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private dialog: MatDialog, private datos: AdministracionDatos) {}

  ngOnInit(): void {
    this.dataSource.filterPredicate = (empresa, filtro) => {
      const filtros = JSON.parse(filtro) as { search: string; status: boolean | null };
      const texto = `${empresa.id} ${empresa.nombre} ${empresa.razonSocial} ${empresa.rfc} ${empresa.telefono} ${empresa.email}`.toLowerCase();
      return (!filtros.search || texto.includes(filtros.search)) && (filtros.status === null || empresa.estado === filtros.status);
    };
    this.obs = this.dataSource.connect();
    this.datos.cargar().subscribe(estado => {
      this.dataSource.data = estado.empresas;
      this.applyFilter();
    });
  }

  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; }

  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({ search: this.currentSearch.trim().toLowerCase(), status: this.currentStatus });
    this.dataSource.paginator?.firstPage();
  }

  setStatus(estado: boolean | null): void { this.currentStatus = estado; this.applyFilter(); }

  get filtrosActivos(): number { return this.currentStatus === null ? 0 : 1; }

  abrirFiltros(): void {
    this.dialog.open(FiltrosAdministracionDialog, {
      width: '560px', panelClass: 'custom-dialog', data: {
        titulo: 'Filtrar empresas',
        filtros: { estado: this.currentStatus },
        campos: [{
          clave: 'estado', etiqueta: 'Estado', icono: 'toggle_on', valorVacio: null,
          opciones: [{ valor: true, etiqueta: 'Activas' }, { valor: false, etiqueta: 'Inactivas' }],
        }],
      },
    }).afterClosed().subscribe((resultado?: Record<string, ValorFiltroAdministracion>) => {
      if (!resultado) return;
      this.currentStatus = resultado['estado'] as boolean | null;
      this.applyFilter();
    });
  }

  abrirDialogo(): void {
    this.dialog.open(EmpresasDialog, {
      width: '700px', panelClass: 'custom-dialog', data: { mode: 'add', rfcs: this.dataSource.data.map(empresa => empresa.rfc) },
    }).afterClosed().subscribe((resultado?: EmpresaAdministracion) => {
      if (!resultado) return;
      const fecha = new Date().toISOString().slice(0, 10);
      this.guardar([{ ...resultado, id: this.siguienteId(), fechaCreacion: fecha, fechaActualizacion: fecha }, ...this.dataSource.data]);
    });
  }

  editar(empresa: EmpresaAdministracion): void {
    this.dialog.open(EmpresasDialog, {
      width: '700px', panelClass: 'custom-dialog',
      data: { mode: 'edit', empresa, rfcs: this.dataSource.data.filter(actual => actual.id !== empresa.id).map(actual => actual.rfc) },
    }).afterClosed().subscribe((resultado?: EmpresaAdministracion) => {
      if (!resultado) return;
      const actualizada = { ...resultado, id: empresa.id, fechaCreacion: empresa.fechaCreacion, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      this.guardar(this.dataSource.data.map(actual => actual.id === empresa.id ? actualizada : actual));
    });
  }

  eliminar(empresa: EmpresaAdministracion): void {
    this.dialog.open(ConfirmDialog, {
      width: '430px', data: {
        title: 'Eliminar empresa',
        message: `¿Deseas eliminar "${empresa.nombre}"? Sus almacenes, roles y usuarios quedarán sin empresa asignada.`,
        confirmText: 'Eliminar', cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe(confirmado => {
      if (confirmado) this.guardar(this.dataSource.data.filter(actual => actual.id !== empresa.id));
    });
  }

  private siguienteId(): string {
    return String(Math.max(0, ...this.dataSource.data.map(empresa => Number(empresa.id) || 0)) + 1);
  }

  private guardar(empresas: EmpresaAdministracion[]): void {
    this.datos.guardarEmpresas(empresas);
    this.applyFilter();
  }
}
