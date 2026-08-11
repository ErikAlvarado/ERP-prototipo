import { Component } from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { RouterOutlet } from '@angular/router';
import { ResponsiveTablesDirective } from '../../../shared/directives/responsive-tables.directive';

@Component({
  selector: 'app-layout',
  imports: [SHARED_IMPORTS, Sidebar, Header, RouterOutlet, ResponsiveTablesDirective],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {}
