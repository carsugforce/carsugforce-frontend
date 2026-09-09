import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  HrCatalogs,
  HrEmployeeListItem,
} from '../../../core/models/hr.models';
import { HrService } from '../../../core/service/hr.service';
import { PermissionService } from '../../../core/service/permission.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  selector: 'app-hr-employees-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './hr-employees-page.component.html',
  styleUrl: './hr-employees-page.component.scss',
})
export class HrEmployeesPageComponent implements OnInit {
  rows: HrEmployeeListItem[] = [];
  catalogs: HrCatalogs | null = null;

  loading = false;
  search = '';
  status = '';
  employeeType = '';
  sucursalesId: number | null = null;
  positionId: number | null = null;

  total = 0;
  page = 1;
  pageSize = 20;

  readonly statuses = [
    { value: 'ACTIVE', label: 'Activos' },
    { value: 'PENDING_APPROVAL', label: 'Pendientes de autorización' },
    { value: 'INACTIVE', label: 'Bajas' },
    { value: 'REJECTED', label: 'Rechazados' },
  ];

  readonly employeeTypes = [
    { value: 'NUEVO', label: 'Nuevo' },
    { value: 'REINGRESO', label: 'Reingreso' },
  ];

  constructor(
    private hrService: HrService,
    public permissionService: PermissionService,
    private snackbar: SnackbarService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadEmployees();
  }

  loadCatalogs(): void {
    this.hrService.getCatalogs().subscribe({
      next: (catalogs) => (this.catalogs = catalogs),
      error: () => this.snackbar.error('No se pudieron cargar los catálogos de RH.'),
    });
  }

  loadEmployees(resetPage = false): void {
    if (resetPage) this.page = 1;

    this.loading = true;
    this.hrService
      .getEmployees({
        search: this.search.trim() || null,
        status: this.status || null,
        employeeType: this.employeeType || null,
        sucursalesId: this.sucursalesId,
        positionId: this.positionId,
        page: this.page,
        pageSize: this.pageSize,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.rows = result.items ?? [];
          this.total = result.total ?? 0;
          this.page = result.page || 1;
          this.pageSize = result.pageSize || 20;
        },
        error: () => this.snackbar.error('No se pudo cargar el catálogo de empleados.'),
      });
  }

  clearFilters(): void {
    this.search = '';
    this.status = '';
    this.employeeType = '';
    this.sucursalesId = null;
    this.positionId = null;
    this.loadEmployees(true);
  }

  onPage(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadEmployees();
  }

  openEmployee(employee: HrEmployeeListItem): void {
    this.router.navigate(['/rh/empleados', employee.id]);
  }

  statusLabel(status: string): string {
    return this.statuses.find((x) => x.value === status)?.label ?? status;
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase().replace('_', '-')}`;
  }

  typeLabel(type: string): string {
    return type === 'REINGRESO' ? 'Reingreso' : 'Nuevo';
  }
}
