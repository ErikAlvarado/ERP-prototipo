import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';
import { MatCardModule } from '@angular/material/card';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import {MatSelectModule} from '@angular/material/select';
import {MatTableModule} from '@angular/material/table';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatCheckboxModule} from '@angular/material/checkbox';
import { MatDialog, MatDialogModule, } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { Status } from '../components/status/status';



export const SHARED_IMPORTS = [
  MatButtonModule,
  MatIconModule,
  MatDividerModule,
  MatFormFieldModule,
  MatInputModule,
  MatListModule,
  MatSidenavModule,
  MatToolbarModule,
  MatCardModule,
  MatChipsModule,
  FormsModule,
  MatGridListModule,
  MatProgressBarModule,
  ReactiveFormsModule,
  RouterLink,
  RouterLinkActive,
  MatTooltipModule,
  MatTreeModule,
  MatSelectModule,
  MatTableModule,
  MatExpansionModule,
  MatCheckboxModule,
  MatDialogModule,
  MatAutocompleteModule,




  Status,
];
