import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';


import { UserService } from '../../core/service/user.service';
import { SnackbarService } from '../../core/service/snackbar.service';
import { MatProgressSpinner } from "@angular/material/progress-spinner";

@Component({
  selector: 'app-user-profile-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinner
],
  templateUrl: './user-profile-dialog.component.html',
  styleUrls: ['./user-profile-dialog.component.scss']
})
export class UserProfileDialogComponent {
  isSaving = false;
  hideCurrent = true;
  hideNew = true;
  hideConfirm = true;

  form = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: [this.passwordsMatchValidator] });

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UserProfileDialogComponent>,
    private userService: UserService,   
    private snackbar: SnackbarService,
    
    @Inject(MAT_DIALOG_DATA) public data: { userName: string; role: string; }
  ) {}

  private passwordsMatchValidator(group: any) {
    const np = group.get('newPassword')?.value;
    const cp = group.get('confirmPassword')?.value;
    return np && cp && np !== cp ? { passwordsNotMatch: true } : null;
  }

  close() {
    this.dialogRef.close(false);
  }

    save() {
    if (this.form.invalid || this.isSaving) return;

    this.isSaving = true;

    this.userService.changePassword({
        currentPassword: this.form.value.currentPassword!,
        newPassword: this.form.value.newPassword!
     }).subscribe({
            next: () => {
        this.snackbar.success('Contraseña cambiada exitosamente');
       
        this.resetFormState();
         this.isSaving = false;

       
        
        },
        error: (err) => {
        const message =
            err?.error?.[0]?.description ||
            err?.error?.message ||
            err?.error ||
            'Error al cambiar la contraseña';

        this.snackbar.error(message);
        this.isSaving = false;
        }
    });
    }


    private resetFormState() {
        this.form.reset();
        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.form.updateValueAndValidity();

        this.hideCurrent = true;
        this.hideNew = true;
        this.hideConfirm = true;
    }


}