import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { MatTableDataSource } from '@angular/material/table';
import { CategoriasDialog } from './dialogs/categorias-dialog/categorias-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { MatDialog } from '@angular/material/dialog';


export interface PeriodicElement {
  nombre: string;
  estado: boolean;
  acciones?: string;
}


const ELEMENT_DATA: PeriodicElement[] = [
  { nombre: 'Cableado', estado: true },
  { nombre: 'Hardware', estado: true },
  { nombre: 'Herramientas', estado: false },
  { nombre: 'Consumibles', estado: true },
  { nombre: 'Accesorios', estado: true },
  { nombre: 'Seguridad', estado: false },
  { nombre: 'Redes', estado: true },
  { nombre: 'Iluminación', estado: true },
  { nombre: 'Automatización', estado: true },
  { nombre: 'Electricidad', estado: false },
];


@Component({
  selector: 'app-categorias',
  imports: [SHARED_IMPORTS],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css',
})
export class Categorias {


  constructor(
    private dialog: MatDialog
  ) {}


  displayedColumns: string[] = [
    'nombre',
    'estado',
    'acciones'
  ];


  dataSource = new MatTableDataSource(ELEMENT_DATA);


  currentSearch = '';
  currentStatus = '';


  ngOnInit() {

    this.dataSource.filterPredicate = (
      data: PeriodicElement,
      filter: string
    ) => {

      const search = JSON.parse(filter);


      const matchSearch =
        data.nombre
        .toLowerCase()
        .includes(search.search);


      const matchStatus =
        search.status === '' ||
        data.estado.toString() === search.status;


      return matchSearch && matchStatus;

    };

  }



  applyFilter() {

    this.dataSource.filter = JSON.stringify({

      search: this.currentSearch.trim().toLowerCase(),

      status: this.currentStatus

    });

  }



  abrirAgregar() {


    this.dialog.open(CategoriasDialog, {

      width:'600px',

      data:{
        mode:'add'
      }

    })
    .afterClosed()
    .subscribe(result=>{


      if(!result) return;


      this.dataSource.data = [

        ...this.dataSource.data,

        result

      ];


    });


  }



  editar(categoria: PeriodicElement) {


    this.dialog.open(CategoriasDialog, {


      width:'600px',


      data:{

        mode:'edit',

        category: categoria

      }


    })
    .afterClosed()
    .subscribe(result=>{


      if(!result) return;


      const index =
        this.dataSource.data.findIndex(

          c => c.nombre === categoria.nombre

        );


      if(index !== -1){


        this.dataSource.data[index] = result;


        this.dataSource.data = [

          ...this.dataSource.data

        ];


      }


    });


  }




  eliminar(categoria: PeriodicElement) {


    this.dialog.open(ConfirmDialog, {


      width:'400px',


      data:{


        title:'Eliminar categoría',


        message:
          `¿Deseas eliminar "${categoria.nombre}"?`,


        confirmText:'Eliminar',


        cancelText:'Cancelar'


      }


    })
    .afterClosed()
    .subscribe(confirmado=>{


      if(!confirmado) return;


      this.dataSource.data =
        this.dataSource.data.filter(


          c => c.nombre !== categoria.nombre


        );


    });


  }


}