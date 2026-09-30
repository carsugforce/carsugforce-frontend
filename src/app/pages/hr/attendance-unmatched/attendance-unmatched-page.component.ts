import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, debounceTime, finalize, takeUntil } from 'rxjs';

import { HrEmployeeListItem, UnmatchedBiometric, UnmatchedBiometricQuery } from '../../../core/models/hr.models';
import { HrService } from '../../../core/service/hr.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  selector: 'app-attendance-unmatched-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule, MatNativeDateModule, MatProgressSpinnerModule],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-MX' }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="unmatched-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">RECURSOS HUMANOS</span>
          <h1>Biometricos sin asociar</h1>
          <p>Relaciona codigos de dispositivo con empleados activos sin cargar miles de controles.</p>
        </div>
        <button mat-stroked-button (click)="load()">
          <mat-icon>refresh</mat-icon>
          Actualizar
        </button>
      </header>

      <mat-card class="toolbar-card">
        <mat-form-field appearance="outline">
          <mat-label>Buscar codigo</mat-label>
          <input matInput [(ngModel)]="query.search" (ngModelChange)="queueLoad()">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Dispositivo</mat-label>
          <input matInput [(ngModel)]="query.deviceCode" (ngModelChange)="queueLoad()">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Codigo empleado</mat-label>
          <input matInput [(ngModel)]="query.employeeCode" (ngModelChange)="queueLoad()">
        </mat-form-field>
        <mat-form-field appearance="outline" class="date-picker-field">
          <mat-label>Desde</mat-label>
          <input matInput [matDatepicker]="fromPicker" [(ngModel)]="dateFrom" (dateChange)="applyFilters()" readonly>
          <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
          <mat-datepicker #fromPicker></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline" class="date-picker-field">
          <mat-label>Hasta</mat-label>
          <input matInput [matDatepicker]="toPicker" [(ngModel)]="dateTo" (dateChange)="applyFilters()" readonly>
          <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
          <mat-datepicker #toPicker></mat-datepicker>
        </mat-form-field>
        <div class="counter">
          <strong>{{ totalItems }}</strong>
          <span>pendientes</span>
        </div>
      </mat-card>

      <mat-card class="table-card">
        <div class="loading" *ngIf="loading">
          <mat-spinner diameter="34"></mat-spinner>
          <span>Cargando codigos pendientes...</span>
        </div>

        <div class="rows" *ngIf="!loading && rows.length; else empty">
          <div class="row header">
            <span>Codigo</span><span>Dispositivo</span><span>Marcaciones</span><span>Periodo</span><span>Accion</span>
          </div>
          <div class="row" *ngFor="let item of rows; trackBy: trackRow">
            <span class="code">{{ item.biometricEmployeeCode }}</span>
            <span>{{ item.deviceCode || '--' }}</span>
            <span>{{ item.punchCount }}</span>
            <span>{{ item.firstPunchAt | date:'dd/MM/yyyy' }} - {{ item.lastPunchAt | date:'dd/MM/yyyy' }}</span>
            <button mat-flat-button color="primary" type="button" (click)="openAssociate(item)">
              <mat-icon>person_search</mat-icon>
              Asociar empleado
            </button>
          </div>
        </div>

        <ng-template #empty>
          <div class="empty" *ngIf="!loading">
            <mat-icon>check_circle</mat-icon>
            <strong>No hay biometricos sin asociar</strong>
            <span>Todos los codigos importados ya estan vinculados.</span>
          </div>
        </ng-template>

        <div class="pager">
          <span>Mostrando {{ rangeLabel() }} de {{ totalItems }}</span>
          <div>
            <button mat-stroked-button [disabled]="page <= 1 || loading" (click)="changePage(-1)">Anterior</button>
            <b>Pagina {{ page }} de {{ totalPages || 1 }}</b>
            <button mat-stroked-button [disabled]="page >= totalPages || loading" (click)="changePage(1)">Siguiente</button>
          </div>
        </div>
      </mat-card>

      <div class="associate-backdrop" *ngIf="associateTarget">
        <mat-card class="associate-modal">
          <header>
            <div>
              <span>Codigo biometrico</span>
              <h2>{{ associateTarget.biometricEmployeeCode }}</h2>
              <p>Dispositivo {{ associateTarget.deviceCode || '--' }}</p>
            </div>
            <button mat-icon-button type="button" (click)="closeAssociate()"><mat-icon>close</mat-icon></button>
          </header>

          <mat-form-field appearance="outline">
            <mat-label>Buscar empleado</mat-label>
            <input matInput [(ngModel)]="employeeSearch" (ngModelChange)="queueEmployeeSearch()" placeholder="Nombre, apellido o codigo">
          </mat-form-field>

          <div class="employee-results">
            <button class="employee-option" type="button" *ngFor="let employee of employees; trackBy: trackEmployee" [class.selected]="employee.id === selectedEmployeeId" (click)="selectedEmployeeId = employee.id">
              <strong>{{ employee.fullName }}</strong>
              <span>{{ employee.sucursalName || 'Sin UEN' }} · {{ employee.idCheck || 'Sin codigo' }}</span>
            </button>
            <div class="empty compact" *ngIf="!employees.length && !searchingEmployees">
              <span>Busca un empleado para asociar.</span>
            </div>
            <div class="loading compact" *ngIf="searchingEmployees">
              <mat-spinner diameter="24"></mat-spinner>
              <span>Buscando...</span>
            </div>
          </div>

          <footer>
            <button mat-stroked-button type="button" (click)="closeAssociate()">Cancelar</button>
            <button mat-flat-button color="primary" type="button" [disabled]="!selectedEmployeeId || associating" (click)="associate()">
              {{ associating ? 'Asociando...' : 'Asociar' }}
            </button>
          </footer>
        </mat-card>
      </div>
    </section>
  `,
  styles: [`
    :host{display:block}.unmatched-page{padding:28px;color:var(--text-primary)}.page-header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:18px}.eyebrow{display:block;color:var(--carsug-red);font-weight:900;letter-spacing:.12em;margin-bottom:4px}.page-header h1{font-size:42px;line-height:1;margin:0 0 8px;color:var(--text-primary)}.page-header p{margin:0;color:var(--text-secondary)}.toolbar-card,.table-card,.associate-modal{background:var(--bg-card)!important;color:var(--text-primary)!important;border:1px solid var(--border-color);border-radius:16px!important;box-shadow:none!important}.toolbar-card{display:grid!important;grid-template-columns:minmax(180px,1fr) minmax(150px,.8fr) minmax(150px,.8fr) minmax(132px,160px) minmax(132px,160px) minmax(130px,.6fr);align-items:end;gap:12px;padding:16px!important;margin-bottom:16px}.date-picker-field{width:100%;min-width:0}.counter{justify-self:end;border:1px solid var(--border-color);border-radius:14px;background:var(--bg-card-alt);padding:10px 14px;min-width:130px}.counter strong,.counter span{display:block}.counter strong{font-size:26px;color:var(--text-primary)}.counter span{color:var(--text-secondary)}.table-card{padding:0!important;overflow:hidden}.rows{overflow:auto}.row{display:grid;grid-template-columns:minmax(120px,.8fr) minmax(140px,.8fr) minmax(110px,.6fr) minmax(220px,1.2fr) minmax(170px,.8fr);gap:12px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border-color);min-width:860px}.header{background:var(--bg-card-alt);color:var(--text-primary);text-transform:uppercase;font-weight:900;font-size:13px}.code{font-weight:900;color:var(--text-primary)}.row button{height:42px}.loading,.empty{display:flex;min-height:220px;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--text-secondary)}.loading.compact,.empty.compact{min-height:70px}.empty mat-icon{font-size:44px;width:44px;height:44px;color:#22c55e}.empty strong{color:var(--text-primary)}.pager{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;border-top:1px solid var(--border-color)}.pager>div{display:flex;align-items:center;gap:10px}.pager span{color:var(--text-secondary)}.associate-backdrop{position:fixed;inset:0;background:rgba(2,6,23,.48);display:flex;align-items:center;justify-content:center;z-index:1000;padding:18px}.associate-modal{width:min(560px,100%);padding:0!important;overflow:hidden}.associate-modal header,.associate-modal footer{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--border-color);background:var(--bg-card-alt)}.associate-modal footer{border-top:1px solid var(--border-color);border-bottom:0;background:var(--bg-card)}.associate-modal header span,.associate-modal header p{color:var(--text-secondary)}.associate-modal h2{margin:3px 0;font-size:28px}.associate-modal p{margin:0}.associate-modal mat-form-field{width:calc(100% - 36px);margin:16px 18px 0}.employee-results{display:grid;gap:8px;max-height:300px;overflow:auto;padding:12px 18px 18px}.employee-option{border:1px solid var(--border-color);border-radius:12px;background:var(--bg-card-alt);color:var(--text-primary);text-align:left;padding:10px 12px;cursor:pointer}.employee-option.selected{border-color:var(--carsug-red);box-shadow:inset 0 0 0 1px var(--carsug-red)}.employee-option strong,.employee-option span{display:block}.employee-option span{color:var(--text-secondary);margin-top:3px}
    @media(max-width:1100px){.toolbar-card{grid-template-columns:1fr 1fr}.counter{justify-self:stretch}}
    @media(max-width:760px){.unmatched-page{padding:18px}.page-header,.pager{align-items:stretch;flex-direction:column}.toolbar-card{grid-template-columns:1fr}.page-header h1{font-size:34px}.pager>div{align-items:stretch;flex-direction:column}}
  `],
})
export class AttendanceUnmatchedPageComponent implements OnInit, OnDestroy {
  rows: UnmatchedBiometric[] = [];
  totalItems = 0;
  totalPages = 0;
  page = 1;
  pageSize = 50;
  loading = false;
  query: UnmatchedBiometricQuery = { page: 1, pageSize: 50 };
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  associateTarget: UnmatchedBiometric | null = null;
  employeeSearch = '';
  employees: HrEmployeeListItem[] = [];
  selectedEmployeeId: number | null = null;
  searchingEmployees = false;
  associating = false;

  private readonly load$ = new Subject<void>();
  private readonly employeeSearch$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(private hr: HrService, private snackbar: SnackbarService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.load$.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => this.applyFilters());
    this.employeeSearch$.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => this.loadEmployees());
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  queueLoad(): void { this.load$.next(); }
  queueEmployeeSearch(): void { this.employeeSearch$.next(); }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.hr.getUnmatchedBiometrics({ ...this.query, dateFrom: toIsoDate(this.dateFrom), dateTo: toIsoDate(this.dateTo), page: this.page, pageSize: this.pageSize })
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (x) => {
          this.rows = x.items;
          this.totalItems = x.totalItems;
          this.totalPages = x.totalPages;
          this.page = x.page;
          this.cdr.markForCheck();
        },
        error: (e) => this.snackbar.error(this.error(e, 'No se pudieron cargar biometricos sin asociar.')),
      });
  }

  changePage(delta: number): void {
    const next = this.page + delta;
    if (next < 1 || (this.totalPages && next > this.totalPages)) return;
    this.page = next;
    this.load();
  }

  openAssociate(item: UnmatchedBiometric): void {
    this.associateTarget = item;
    this.employeeSearch = '';
    this.employees = [];
    this.selectedEmployeeId = null;
  }

  closeAssociate(): void {
    if (this.associating) return;
    this.associateTarget = null;
  }

  loadEmployees(): void {
    if (!this.employeeSearch.trim()) {
      this.employees = [];
      this.cdr.markForCheck();
      return;
    }

    this.searchingEmployees = true;
    this.hr.getEmployees({ search: this.employeeSearch, status: 'ACTIVE', page: 1, pageSize: 20 })
      .pipe(finalize(() => { this.searchingEmployees = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (x) => { this.employees = x.items; this.cdr.markForCheck(); },
        error: (e) => this.snackbar.error(this.error(e, 'No se pudieron buscar empleados.')),
      });
  }

  associate(): void {
    if (!this.associateTarget || !this.selectedEmployeeId || this.associating) return;
    this.associating = true;
    this.hr.associateBiometricIdentity({
      employeeId: this.selectedEmployeeId,
      biometricEmployeeCode: this.associateTarget.biometricEmployeeCode,
      deviceCode: this.associateTarget.deviceCode,
    }).pipe(finalize(() => { this.associating = false; this.cdr.markForCheck(); })).subscribe({
      next: () => {
        this.snackbar.success('Biometrico asociado.');
        this.closeAssociate();
        this.load();
      },
      error: (e) => this.snackbar.error(this.error(e, 'No se pudo asociar el biometrico.')),
    });
  }

  rangeLabel(): string {
    if (!this.totalItems) return '0';
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.totalItems, this.page * this.pageSize);
    return `${start}-${end}`;
  }

  trackRow(_: number, item: UnmatchedBiometric): string {
    return `${item.biometricEmployeeCode}|${item.deviceCode}`;
  }

  trackEmployee(_: number, item: HrEmployeeListItem): number { return item.id; }

  private error(error: any, fallback: string): string {
    return error?.error?.message || error?.error || fallback;
  }
}

function toIsoDate(value: Date | null): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
