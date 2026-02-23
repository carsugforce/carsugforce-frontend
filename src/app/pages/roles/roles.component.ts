import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { RolesService } from '../../core/service/roles.service';
import { Rolespermissions } from '../../core/service/rolespermissions.service';

import { Role } from '../../core/models/role.model';
import { Permission } from '../../core/models/permissions.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PermissionService } from '../../core/service/permission.service';
import { ROLE_HIERARCHY } from '../../core/guard/roles-hierarchy';
import { UserService } from '../../core/service/user.service';

interface PermissionCategory {
  id: number;
  label: string;
  icon: string;
  visible: boolean;
  expanded: boolean;
  permissions: Permission[];
}




@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
  ],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss'],
})
export class RolesComponent {
  permissionCategories: PermissionCategory[] = [];
  categoriesDb: any[] = [];

  selectedRole: Role | null = null;
  isRoleNameDisabled = true;

  roleSearch = '';
  permissionSearch = '';

  roles: Role[] = [];
  rolesFiltered: Role[] = [];

  currentUserRole = '';

  constructor(
    private rolesService: RolesService,
    private permissionsService: Rolespermissions,
     public permissionService: PermissionService,
    private userService: UserService,
    private dialog: MatDialog
   
  ) {}

  ngOnInit() {
    this.userService.getMe().subscribe({
      next: (me: any) => {
        this.currentUserRole = me.roles?.[0] ?? '';
        this.loadCategories(); // 👈 AHORA SÍ
      },
      error: () => {},
    });
  }

  loadCategories() {
    this.permissionsService.getCategories().subscribe({
      next: (cats) => {
        this.categoriesDb = cats;
        this.loadRoles();
      },
      error: (err) => console.error('Error cargando categorías', err),
    });
  }

  // ===============================
  // 2) CARGAR ROLES
  // ===============================
  loadRoles(callback?: () => void) {
    this.rolesService.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;

        const myLevel = ROLE_HIERARCHY[this.currentUserRole] ?? 0;

        this.rolesFiltered = roles.filter((r) => {
          const level = ROLE_HIERARCHY[r.name] ?? 0;

          if (this.currentUserRole === 'SuperAdmin') {
            return level <= myLevel;
          }

          return level < myLevel;
        });

        if (callback) callback();
        else if (this.rolesFiltered.length > 0) {
          this.selectRole(this.rolesFiltered[0]);
        }
      },
    });
  }

  // ===============================
  // SELECCIONAR ROL
  // ===============================
  selectRole(role: Role) {
    this.isRoleNameDisabled = true;
    this.selectedRole = JSON.parse(JSON.stringify(role));
    this.loadRolePermissions(role.id);
  }

  // ===============================
  // NUEVO ROL
  // ===============================
  newRole() {
    this.isRoleNameDisabled = false;

    this.selectedRole = { id: 0, name: '', permissions: [] };

    this.permissionsService.getPermissions().subscribe((perms) => {
      perms = perms.map((p) => ({ ...p, enabled: false }));
      this.permissionCategories = this.buildPermissionCategories(perms);
    });
  }

  // ===============================
  // CARGAR PERMISOS DEL ROL
  // ===============================
  loadRolePermissions(roleId: number) {
    this.permissionsService.getPermissionsByRole(roleId).subscribe((perms) => {
      this.permissionCategories = this.buildPermissionCategories(perms);
    });
  }

  // ===============================
  // AGRUPAR PERMISOS POR CategoryId
  // ===============================
  private buildPermissionCategories(perms: Permission[]): PermissionCategory[] {
    const categories: PermissionCategory[] = [];

    // Crear categorías
    this.categoriesDb.forEach((cat) => {
      categories.push({
        id: cat.id,
        label: cat.label,
        icon: cat.icon,
        visible: true,
        expanded: false,
        permissions: [],
      });
    });

    // Agregar permisos a cada categoría
    perms.forEach((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      if (cat) cat.permissions.push(p);
    });

    return categories.filter((c) => c.permissions.length > 0);
  }

  // ===============================
  // VALIDAR ROL
  // ===============================
  isRoleValid(): boolean {
    if (!this.selectedRole) return false;
    const name = this.selectedRole.name?.trim();
    if (this.isSuperAdmin) return false;
    return name.length >= 5;
  }

  // ===============================
  // GUARDAR ROL
  // ===============================
  saveRole() {
    if (!this.selectedRole) return;

    const granted: number[] = [];

    this.permissionCategories.forEach((cat) => {
      cat.permissions.forEach((p) => {
        if (p.enabled) granted.push(p.id);
      });
    });

    this.selectedRole.permissions = granted;

    const isNew = this.selectedRole.id === 0;

    if (granted.length === 0) {
      const ref = this.dialog.open(ConfirmDialogComponent, {
        width: '350px',
        data: {
          type: 'warning',
          title: isNew ? 'Rol sin permisos' : 'Actualización sin permisos',
          message: isNew
            ? '¿Crear rol sin permisos?'
            : 'Este rol quedará sin permisos. ¿Deseas continuar?',
          showCancel: true,
          cancelText: 'Cancelar',
          confirmText: isNew ? 'Crear' : 'Actualizar',
        },
      });

      ref.afterClosed().subscribe((ok) => {
        if (ok) this.saveRoleConfirmed(isNew);
      });

      return;
    }

    this.saveRoleConfirmed(isNew);
  }

  saveRoleConfirmed(isNew: boolean) {
    const payload = {
      id: this.selectedRole!.id,
      name: this.selectedRole!.name,
      permissions: this.selectedRole!.permissions,
    };

    if (isNew) {
      this.rolesService.createRole(payload).subscribe({
        next: (created) => {
          this.dialog.open(ConfirmDialogComponent, {
            width: '350px',
            data: {
              type: 'success',
              title: 'Rol creado',
              message: 'El rol fue creado correctamente.',
              confirmText: 'Aceptar',
            },
          });

          this.loadRoles(() => this.selectRole(created));
        },
        error: (err) => this.showError(err),
      });
    } else {
      this.rolesService.updateRole(payload).subscribe({
        next: () => {
          this.dialog.open(ConfirmDialogComponent, {
            width: '350px',
            data: {
              type: 'success',
              title: 'Rol actualizado',
              message: 'Cambios guardados.',
              confirmText: 'Aceptar',
            },
          });

          this.loadRoles(() => {
            const updated = this.roles.find((r) => r.id === payload.id);
            if (updated) this.selectRole(updated);
          });
        },
        error: (err) => this.showError(err),
      });
    }
  }

  // ===============================
  // DELETE ROLE COMPLETO
  // ===============================
  confirmDeleteRole() {
    if (!this.selectedRole) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        type: 'warning',
        title: 'Eliminar rol',
        message: `¿Seguro que deseas eliminar el rol "${this.selectedRole.name}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        showCancel: true,
      },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) this.deleteRole();
    });
  }

  deleteRole() {
    if (!this.selectedRole) return;

    this.rolesService.deleteRole(this.selectedRole!.id).subscribe({
      next: () => {
        this.dialog.open(ConfirmDialogComponent, {
          width: '350px',
          data: {
            type: 'success',
            title: 'Rol eliminado',
            message: 'El rol se eliminó correctamente.',
            confirmText: 'Aceptar',
          },
        });

        this.loadRoles(() => {
          if (this.roles.length > 0) {
            this.selectRole(this.roles[0]);
          } else {
            this.selectedRole = null;
            this.permissionCategories = [];
          }
        });
      },
      error: (err) => this.showError(err),
    });
  }

  // ===============================
  // ERROR HANDLER
  // ===============================
  showError(err: any) {
    const msg = err.error || err.message || 'Error desconocido';
    this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        type: 'error',
        title: 'Error',
        message: msg,
        confirmText: 'Aceptar',
      },
    });
  }

  // ===============================
  // SEARCH
  // ===============================
  filterRoles() {
    const t = this.roleSearch.toLowerCase();
    this.rolesFiltered = this.roles.filter((r) =>
      r.name.toLowerCase().includes(t)
    );
  }

  onPermissionSearch(value: string) {
    const search = this.permissionSearch.toLowerCase();
    this.permissionCategories.forEach((cat) => {
      const match = cat.permissions.some((p) =>
        p.label.toLowerCase().includes(search)
      );
      cat.visible = match || !search;
      cat.expanded = match && search !== '';
    });
  }

  filterPermissions(cat: PermissionCategory) {
    const search = this.permissionSearch.trim().toLowerCase();
    if (!search) return cat.permissions;

    return cat.permissions.filter((p) =>
      p.label.toLowerCase().includes(search)
    );
  }

  // ===============================
  // EDITAR NOMBRE
  // ===============================
  toggleEditRoleName() {
    if (this.selectedRole?.name === 'SuperAdmin') return;
    this.isRoleNameDisabled = !this.isRoleNameDisabled;
  }

  get isSuperAdmin() {
    return this.selectedRole?.name === 'SuperAdmin';
  }

  // ===============================
  // CREAR PERMISO (FUTURO)
  // ===============================
  openCreatePermission() {
    //console.log('Crear nuevo permiso…');
  }

  canEditRoles(): boolean {
    //console.log(this.permissionService);
    return this.isSuperAdmin || !this.permissionService.has('roles.edit');
  }

  isCategoryEnabled(cat: any): boolean {
    return cat.permissions.some((p: any) => p.enabled);
  }


  isCategoryIndeterminate(cat: PermissionCategory): boolean {
    const enabledCount = cat.permissions.filter(
      (p: Permission) => p.enabled
    ).length;

    return enabledCount > 0 && enabledCount < cat.permissions.length;
  }

  toggleCategory(cat: PermissionCategory, enabled: boolean) {
    if (this.canEditRoles()) return;

    cat.permissions.forEach((p: Permission) => {
      p.enabled = enabled;
    });
  }

  hasAnyPermissionEnabled(cat: PermissionCategory): boolean {
    return cat.permissions.some((p: Permission) => p.enabled);
  }
  
  getCategoryColor(cat: PermissionCategory):  'accent' | '' {
    const total = cat.permissions.length;
    const enabled = cat.permissions.filter(p => p.enabled).length;

    if (enabled === 0) return '';      
    if (enabled === total) return 'accent';   
    return '';                           
  }


}
