import { Component, signal} from '@angular/core';
import { SHARED_IMPORTS } from '../../../shared/imports/shared-imports';
import {FormControl,FormGroupDirective,NgForm,Validators,FormsModule,ReactiveFormsModule,} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';

export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

@Component({
  selector: 'app-register',
  imports: [SHARED_IMPORTS],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  emailFormControl = new FormControl('', [Validators.required, Validators.email]);
  matcher = new MyErrorStateMatcher();

  hidePassword = signal(true);
  hideConfirmPassword = signal(true);

  togglePasswordVisibility(event: MouseEvent) {
    this.hidePassword.set(!this.hidePassword());
    event.stopPropagation();
  }

  toggleConfirmPasswordVisibility(event: MouseEvent) {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
    event.stopPropagation();
  }
}
