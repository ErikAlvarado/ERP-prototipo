import { Component, Input } from '@angular/core';
import { SHARED_IMPORTS } from '../../imports/shared-imports';

@Component({
  selector: 'app-status',
  imports: [SHARED_IMPORTS],
  templateUrl: './status.html',
  styleUrl: './status.css',
})
export class Status {
  @Input() active!: boolean;
}
