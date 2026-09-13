import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-MX' }],
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
  startDate: Date | null = null;
  birthDate: Date | null = null;
  startMonth: number | null = null;

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

  readonly months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  constructor(
    private hrService: HrService,
    public permissionService: PermissionService,
    private snackbar: SnackbarService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loadCatalogs();
    this.route.queryParams.subscribe((params) => {
      this.positionId = params['positionId'] ? Number(params['positionId']) : null;
      this.status = params['status'] || '';
      this.startDate = this.parseDateParam(params['startDate']);
      this.birthDate = this.parseDateParam(params['birthDate']);
      this.startMonth = params['startMonth'] ? Number(params['startMonth']) : null;
      this.page = 1;
      this.loadEmployees();
    });
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
        startDate: this.toIsoDate(this.startDate),
        birthDate: this.toIsoDate(this.birthDate),
        startMonth: this.startMonth,
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
    this.startDate = null;
    this.birthDate = null;
    this.startMonth = null;
    this.router.navigate(['/rh/empleados']);
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
    if (status === 'PENDING_APPROVAL') return 'Pendiente';
    return this.statuses.find((x) => x.value === status)?.label ?? status;
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase().replace('_', '-')}`;
  }

  typeLabel(type: string): string {
    return type === 'REINGRESO' ? 'Reingreso' : 'Nuevo';
  }

  private parseDateParam(value: unknown): Date | null {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toIsoDate(value: Date | null): string | null {
    if (!value) return null;
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
}
