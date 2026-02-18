import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { RolesService } from '../../core/service/roles.service';
import { UserService } from '../../core/service/user.service';
import { Role } from '../../core/models/role.model';
import { ROLE_HIERARCHY } from '../../core/guard/roles-hierarchy';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { SucursalService } from '../../core/service/sucursales.service';
import { SucursalSimple } from '../../core/models/sucursalsimple.model';


@Component({
  selector: 'user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './user-form-dialog.component.html',
  styleUrls: ['./user-form-dialog.component.scss']
})
export class UserFormDialog implements OnInit {

  roles: Role[] = [];
  visibleRoles: Role[] = [];
  sucursales: SucursalSimple[] = [];

  backendErrors: string[] = [];
  loading = false;
  hidePassword = true;

  currentUserRole = '';

  form = this.fb.group({
    userName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['', Validators.required],
    sucursalesId: ['', Validators.required],
    password: ['']
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<UserFormDialog>,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private rolesService: RolesService,
    private sucursalService: SucursalService,
    private userService: UserService
  ) {
    this.currentUserRole = data.currentUserRole;
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadSucursal();

    if (this.data.mode === 'edit') {
      this.form.patchValue({
        userName: this.data.user.userName,
        email: this.data.user.email,
        role: this.data.user.role,
        sucursalesId: this.data.user.sucursalesId
      });


      // password NO obligatorio en edit
      this.form.get('password')?.clearValidators();
    } else {
      // password obligatorio en create
      this.form.get('password')?.setValidators(Validators.required);
    }

    this.form.get('password')?.updateValueAndValidity();
  }

  // ===============================
  // ROLES CON JERARQUÍA
  // ===============================
  loadRoles() {
    this.rolesService.getRoles().subscribe(roles => {
      this.roles = roles;

      const myLevel = ROLE_HIERARCHY[this.currentUserRole] ?? 0;

      this.visibleRoles = roles.filter(r => {
        const roleLevel = ROLE_HIERARCHY[r.name] ?? 0;
        return roleLevel <= myLevel;
      });
    });
  }

  loadSucursal() {
    this.sucursalService.getAllSucursalesSimple().subscribe(sucursales => {
      this.sucursales = sucursales;
    });
  }

  // ===============================
  // SAVE (CREATE / UPDATE)
  // ===============================
  save() {
    if (this.form.invalid || this.loading) return;

    this.backendErrors = [];
    this.loading = true;

    const payload = this.form.value;

    const request$ =
      this.data.mode === 'create'
        ? this.userService.create(payload)
        : this.userService.update(this.data.user.id, payload);

        console.log(payload)

    request$.subscribe({
      next: () => {
        this.loading = false;

        this.dialog.open(ConfirmDialogComponent, {
          width: '350px',
          data: {
            type: 'success',
            title: this.data.mode === 'create'
              ? 'Usuario creado'
              : 'Usuario actualizado',
            message: `El usuario ${payload.email} fue guardado correctamente.`,
            confirmText: 'Aceptar'
          }
        });

       
        this.dialogRef.close('saved');
      },
      error: err => {
        this.loading = false;

       
        if (typeof err.error === 'string') {
          this.backendErrors = [err.error];
        } else if (Array.isArray(err.error)) {
          this.backendErrors = err.error.map((e: any) => e.description);
        } else {
          this.backendErrors = ['Error inesperado'];
        }
      }
    });
  }

  // ===============================
  // PASSWORD TOGGLE
  // ===============================
  togglePassword() {
    this.hidePassword = !this.hidePassword;
  }

  // ===============================
  // CANCEL
  // ===============================
  cancel() {
    this.dialogRef.close();
  }
}
