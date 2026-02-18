import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';

import { AgGridModule } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  CellClickedEvent,
} from 'ag-grid-community';

import { UserService } from '../../core/service/user.service';
import { PermissionService } from '../../core/service/permission.service';
import { ROLE_HIERARCHY } from '../../core/guard/roles-hierarchy';

import { UserFormDialog } from '../../modals/credi-user/user-form.dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { RenderUserColumnsComponent } from './render-user-columns/render-user-columns.component';

@Component({
  selector: 'app-users',
  standalone: true,
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    AgGridModule,
  ],
})
export class UsersComponent {
  searchText = '';
  rowData: any[] = [];

  currentUserRole = '';

  private gridApi!: GridApi;

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    public permissionService: PermissionService
  ) {}

  // =============================
  //  GRID CONFIG
  // =============================
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  columnDefs: ColDef[] = [
    {
      field: 'userName',
      headerName: 'Usuario',
      flex: 1,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
    },
    {
      field: 'sucursal',
      headerName: 'Sitio',
      flex: 1,
    },
    {
      field: 'role',
      headerName: 'Rol',
      flex: 1,
      cellRenderer: (
        params: ICellRendererParams<string>
      ) => `<span style="padding: 6px 16px !important;
              border-radius: 14px !important;
              font-size: 14px !important;
              font-weight: 600 !important;
              color: var(--text-primary) !important;
              background: rgba(255, 255, 255, 0.12) !important;
              border: 1px solid rgba(255, 255, 255, 0.09) !important;
              backdrop-filter: blur(3px) !important;"> ${params.value ?? ''}</span>`,
    },
    {
      headerName: 'Acciones',
      cellRenderer: RenderUserColumnsComponent,
      width: 120,
    },
  ];

  // =============================
  //  LIFECYCLE
  // =============================
  ngOnInit() {
    this.userService.getMe().subscribe((me: any) => {
      this.currentUserRole = me.roles?.[0] ?? '';
      this.loadUsers();
    });
  }

  // =============================
  //  GRID EVENTS
  // =============================
  onGridReady(event: GridReadyEvent) {
    this.gridApi = event.api;
  }

  onQuickFilterChanged() {
    this.gridApi.setGridOption('quickFilterText', this.searchText);
  }

  // =============================
  //  DATA
  // =============================
  loadUsers() {
    this.userService.getAll().subscribe({
      next: (users) => {
        
        const myLevel = ROLE_HIERARCHY[this.currentUserRole] ?? 0;
        const isSuperAdmin = this.currentUserRole === 'SuperAdmin';

        this.rowData = users
          .filter((u) => {
            const userLevel = ROLE_HIERARCHY[u.role] ?? 0;

            return isSuperAdmin ? userLevel <= myLevel : userLevel < myLevel;
          })
          .map((u) => ({
            id: u.id,
            userName: u.userName ?? '',
            email: u.email,
            role: u.role ?? '-',
             sucursal: u.sucursal?.description ?? '—',
             sucursalesId: u.sucursal?.id ?? null
          }));
      },
      error: () => console.error('Error cargando usuarios'),
    });
  }

  // =============================
  //  ACTIONS
  // =============================
  createUser() {
    const dialogRef = this.dialog.open(UserFormDialog, {
      width: '600px',
      panelClass: 'custom-dialog-panel',
      disableClose: true,
      data: {
        mode: 'create',
        currentUserRole: this.currentUserRole,
      },
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.loadUsers();
    });
  }

  editUser(user: any) {
    const dialogRef = this.dialog.open(UserFormDialog, {
      width: '600px',
      panelClass: 'custom-dialog-panel',
      disableClose: true,
      data: {
        mode: 'edit',
        user,
        currentUserRole: this.currentUserRole,
      },
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.loadUsers();
    });
  }

  deleteUser(user: any) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        type: 'warning',
        title: 'Eliminar usuario',
        message: `¿Seguro que deseas eliminar al usuario ${user.email}?`,
        showCancel: true,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      this.userService.delete(user.id).subscribe({
        next: () => {
          this.loadUsers();

          this.dialog.open(ConfirmDialogComponent, {
            width: '350px',
            data: {
              type: 'success',
              title: 'Usuario eliminado',
              message: 'El usuario fue eliminado correctamente',
              confirmText: 'Aceptar',
            },
          });
        },
        error: () => {
          this.dialog.open(ConfirmDialogComponent, {
            width: '350px',
            data: {
              type: 'error',
              title: 'Error',
              message: 'No se pudo eliminar el usuario',
              confirmText: 'Aceptar',
            },
          });
        },
      });
    });
  }
}
