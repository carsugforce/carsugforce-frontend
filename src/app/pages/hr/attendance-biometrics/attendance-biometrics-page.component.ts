import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { Router } from '@angular/router';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';

import { BiometricImport, BiometricPunch, BiometricPunchQuery } from '../../../core/models/hr.models';
import { HrService } from '../../../core/service/hr.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  selector: 'app-attendance-biometrics-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-MX' }],
  template: `
    <section class="biometric-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">RECURSOS HUMANOS</span>
          <h1>Importar biometricos</h1>
          <p>Sube archivos .KQ o .ZIP y revisa la evidencia importada antes del analisis.</p>
        </div>
      </header>

      <mat-card class="upload-card" [class.locked]="isImporting">
        <label class="dropzone" [class.disabled]="isImporting">
          <input type="file" accept=".kq,.KQ,.zip,.ZIP" [disabled]="isImporting" (change)="onFile($event)">
          <mat-icon>upload_file</mat-icon>
          <strong>{{ file?.name || 'Seleccionar archivo biometrico' }}</strong>
          <span>.KQ individual o ZIP con varios dispositivos</span>
        </label>

        <div class="upload-actions">
          <div class="file-meta">
            <span>Archivo</span>
            <strong>{{ file?.name || 'Sin archivo seleccionado' }}</strong>
          </div>
          <button mat-flat-button color="primary" [disabled]="!file || isImporting" (click)="upload()">
            <mat-icon>cloud_upload</mat-icon>
            {{ isImporting ? 'Importando...' : 'Importar' }}
          </button>
        </div>

        <div class="import-overlay" *ngIf="isImporting">
          <mat-spinner diameter="42"></mat-spinner>
          <div>
            <strong>{{ uploadProgress === null || uploadProgress >= 100 ? 'Procesando biometricos' : 'Subiendo archivo' }}</strong>
            <span>{{ file?.name }}</span>
            <p *ngIf="uploadProgress !== null && uploadProgress < 100">{{ uploadProgress }}% cargado</p>
            <p *ngIf="uploadProgress === null || uploadProgress >= 100">CarsugForce esta analizando dispositivos, marcaciones y duplicados.</p>
          </div>
        </div>
      </mat-card>

      <mat-card class="summary-card" *ngIf="lastImport">
        <div class="summary-title">
          <div>
            <strong>Importacion completada</strong>
            <span>{{ lastImport.originalFileName }}</span>
          </div>
          <div class="summary-actions">
            <button mat-stroked-button type="button" (click)="showImportedRecords(lastImport)">
              <mat-icon>table_view</mat-icon>
              Ver registros importados
            </button>
            <button mat-stroked-button type="button" [disabled]="!lastImport.lastPunchAt" (click)="goToLastWeek(lastImport)">
              <mat-icon>calendar_month</mat-icon>
              Ir a ultima semana
            </button>
          </div>
        </div>
        <div class="summary-grid">
          <div><span>Dispositivos</span><strong>{{ lastImport.devicesFound }}</strong></div>
          <div><span>Registros encontrados</span><strong>{{ lastImport.recordsFound }}</strong></div>
          <div><span>Nuevos</span><strong>{{ lastImport.recordsCreated }}</strong></div>
          <div><span>Duplicados</span><strong>{{ lastImport.recordsDuplicated }}</strong></div>
          <div><span>IDs biometricos</span><strong>{{ lastImport.biometricCodesFound }}</strong></div>
          <div><span>Empleados asociados</span><strong>{{ lastImport.associatedEmployees }}</strong></div>
          <div><span>Sin asociar</span><strong>{{ lastImport.unmatchedEmployees }}</strong></div>
          <div><span>Periodo real</span><strong>{{ periodLabel(lastImport) }}</strong></div>
        </div>
      </mat-card>

      <mat-card class="history-card">
        <div class="history-head">
          <div>
            <strong>Historial de importaciones</strong>
            <span>{{ imports.length }} archivos procesados</span>
          </div>
          <button mat-stroked-button [disabled]="isImporting" (click)="loadImports()">
            <mat-icon>refresh</mat-icon>
            Actualizar
          </button>
        </div>

        <div class="imports-table" *ngIf="imports.length; else emptyImports">
          <div class="row header">
            <span>Archivo</span><span>Estado</span><span>Registros</span><span>Periodo</span><span>Fecha</span><span>Accion</span>
          </div>
          <div class="row" *ngFor="let item of imports; trackBy: trackImport">
            <span class="file-name">{{ item.originalFileName }}</span>
            <span><b class="status" [class.ok]="item.status === 'SUCCESS'">{{ statusLabel(item.status) }}</b></span>
            <span>{{ item.recordsCreated }} nuevos / {{ item.recordsDuplicated }} dup.</span>
            <span>{{ periodLabel(item) }}</span>
            <span>{{ item.importedAt | date:'dd/MM/yyyy HH:mm' }}</span>
            <button mat-stroked-button type="button" (click)="showImportedRecords(item)">
              <mat-icon>table_view</mat-icon>
              Ver registros
            </button>
          </div>
        </div>

        <ng-template #emptyImports>
          <div class="empty">
            <mat-icon>folder_open</mat-icon>
            <strong>Aun no hay importaciones</strong>
            <span>Sube el primer archivo para iniciar el historial.</span>
          </div>
        </ng-template>
      </mat-card>

      <mat-card class="records-card">
        <div class="records-head">
          <div>
            <strong>Registros importados</strong>
            <span>{{ totalPunches }} registros encontrados</span>
          </div>
          <button mat-stroked-button type="button" (click)="loadPunches()">
            <mat-icon>refresh</mat-icon>
            Actualizar
          </button>
        </div>

        <div class="filters">
          <mat-form-field appearance="outline">
            <mat-label>Empleado o codigo</mat-label>
            <input matInput [(ngModel)]="punchQuery.search" (keyup.enter)="applyPunchFilters()">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Dispositivo</mat-label>
            <input matInput [(ngModel)]="punchQuery.deviceCode" (keyup.enter)="applyPunchFilters()">
          </mat-form-field>
          <mat-form-field appearance="outline" class="date-picker-field">
            <mat-label>Desde</mat-label>
            <input matInput [matDatepicker]="punchFromPicker" [(ngModel)]="punchDateFrom" (dateChange)="applyPunchFilters()" readonly>
            <mat-datepicker-toggle matIconSuffix [for]="punchFromPicker"></mat-datepicker-toggle>
            <mat-datepicker #punchFromPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" class="date-picker-field">
            <mat-label>Hasta</mat-label>
            <input matInput [matDatepicker]="punchToPicker" [(ngModel)]="punchDateTo" (dateChange)="applyPunchFilters()" readonly>
            <mat-datepicker-toggle matIconSuffix [for]="punchToPicker"></mat-datepicker-toggle>
            <mat-datepicker #punchToPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Tipo</mat-label>
            <mat-select [(ngModel)]="punchQuery.recordType">
              <mat-option [value]="null">Todos</mat-option>
              <mat-option value="ENTRADA">ENTRADA</mat-option>
              <mat-option value="SALIDA">SALIDA</mat-option>
              <mat-option value="INICIO BREAK">INICIO BREAK</mat-option>
              <mat-option value="FIN BREAK">FIN BREAK</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Asociacion</mat-label>
            <mat-select [(ngModel)]="punchQuery.associationStatus">
              <mat-option [value]="null">Todos</mat-option>
              <mat-option value="ASOCIADOS">Asociados</mat-option>
              <mat-option value="SIN_ASOCIAR">Sin asociar</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary" type="button" (click)="applyPunchFilters()">
            <mat-icon>search</mat-icon>
            Buscar
          </button>
        </div>

        <div class="records-table" *ngIf="punches.length; else emptyPunches">
          <div class="punch-row header">
            <span>UEN / Depto.</span><span>Empleado</span><span>Codigo</span><span>Fecha</span><span>Hora</span><span>Registro</span><span>Dispositivo</span><span>Origen</span>
          </div>
          <div class="punch-row" *ngFor="let item of punches; trackBy: trackPunch">
            <span>{{ item.sucursalName || 'Sin UEN' }}</span>
            <span [class.unmatched]="!item.isAssociated">{{ item.employeeName || 'SIN ASOCIAR' }}</span>
            <span class="code">{{ item.biometricEmployeeCode }}</span>
            <span>{{ item.timestamp | date:'dd/MM/yyyy' }}</span>
            <span>{{ item.timestamp | date:'HH:mm' }}</span>
            <span>{{ item.normalizedRecordType || item.rawRecordType || 'RAW' }}</span>
            <span>{{ item.deviceCode || '--' }}</span>
            <span>{{ item.importFileName }}</span>
          </div>
        </div>

        <ng-template #emptyPunches>
          <div class="empty">
            <mat-icon>fingerprint</mat-icon>
            <strong>Sin registros para los filtros seleccionados</strong>
            <span>Importa un archivo o ajusta los filtros.</span>
          </div>
        </ng-template>

        <div class="pager">
          <span>Mostrando {{ rangeLabel() }} de {{ totalPunches }}</span>
          <div>
            <button mat-stroked-button [disabled]="punchPage <= 1 || loadingPunches" (click)="changePunchPage(-1)">Anterior</button>
            <b>Pagina {{ punchPage }} de {{ totalPunchPages || 1 }}</b>
            <button mat-stroked-button [disabled]="punchPage >= totalPunchPages || loadingPunches" (click)="changePunchPage(1)">Siguiente</button>
          </div>
        </div>
      </mat-card>
    </section>
  `,
  styles: [`
    :host{display:block}.biometric-page{padding:28px;color:var(--text-primary)}.page-header{margin-bottom:18px}.eyebrow{display:block;color:var(--carsug-red);font-weight:900;letter-spacing:.12em;margin-bottom:4px}.page-header h1{font-size:42px;line-height:1;margin:0 0 8px;color:var(--text-primary)}.page-header p{margin:0;color:var(--text-secondary)}.upload-card,.history-card,.records-card,.summary-card{background:var(--bg-card)!important;color:var(--text-primary)!important;border:1px solid var(--border-color);border-radius:16px!important;box-shadow:none!important}.upload-card{position:relative;display:grid!important;grid-template-columns:minmax(320px,1fr) minmax(280px,420px);gap:16px;align-items:stretch;padding:18px!important;margin-bottom:18px;overflow:hidden}.upload-card.locked{pointer-events:none}.dropzone{display:flex;min-height:150px;align-items:center;justify-content:center;flex-direction:column;gap:8px;border:1px dashed var(--border-color);border-radius:14px;background:var(--bg-card-alt);cursor:pointer;text-align:center}.dropzone.disabled{cursor:not-allowed;opacity:.65}.dropzone input{display:none}.dropzone mat-icon{font-size:42px;width:42px;height:42px;color:var(--text-secondary)}.dropzone strong{font-size:18px;color:var(--text-primary)}.dropzone span,.file-meta span{color:var(--text-secondary)}.upload-actions{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;border:1px solid var(--border-color);border-radius:14px;background:var(--bg-card-alt);padding:16px}.file-meta strong{display:block;margin-top:4px;word-break:break-word;color:var(--text-primary)}.upload-actions button{height:48px;font-weight:900}.import-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:18px;background:color-mix(in srgb,var(--bg-card) 88%,transparent);backdrop-filter:blur(2px);z-index:3;text-align:left}.import-overlay strong,.import-overlay span{display:block}.import-overlay span,.import-overlay p{color:var(--text-secondary);margin:4px 0 0}.summary-card{padding:16px!important;margin-bottom:18px}.summary-title,.history-head,.records-head,.pager{display:flex;justify-content:space-between;align-items:center;gap:14px}.summary-title strong,.summary-title span,.history-head strong,.history-head span,.records-head strong,.records-head span{display:block}.summary-title span,.history-head span,.records-head span{color:var(--text-secondary);margin-top:2px}.summary-actions{display:flex;gap:8px;flex-wrap:wrap}.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.summary-grid div{border:1px solid var(--border-color);border-radius:12px;background:var(--bg-card-alt);padding:10px}.summary-grid span{display:block;color:var(--text-secondary);font-size:12px}.summary-grid strong{display:block;margin-top:3px}.history-card,.records-card{padding:0!important;overflow:hidden;margin-bottom:18px}.history-head,.records-head{padding:16px 18px;border-bottom:1px solid var(--border-color)}.imports-table,.records-table{overflow:auto}.row{display:grid;grid-template-columns:minmax(220px,1.4fr) minmax(110px,.7fr) minmax(150px,.9fr) minmax(180px,1fr) minmax(150px,.8fr) minmax(150px,.8fr);gap:12px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border-color);min-width:980px}.header{background:var(--bg-card-alt);color:var(--text-primary);text-transform:uppercase;font-weight:900;font-size:12px}.file-name,.code{font-weight:800}.status{display:inline-flex;border:1px solid #854d0e;border-radius:999px;padding:4px 10px;color:#b45309;background:color-mix(in srgb,var(--bg-card) 82%,#f59e0b 18%)}.status.ok{border-color:#16a34a;color:#15803d;background:color-mix(in srgb,var(--bg-card) 82%,#22c55e 18%)}.filters{display:grid;grid-template-columns:minmax(220px,1.25fr) minmax(170px,.85fr) minmax(132px,160px) minmax(132px,160px) minmax(160px,.8fr) minmax(160px,.8fr) minmax(132px,150px);gap:12px;align-items:stretch;padding:14px 16px;border-bottom:1px solid var(--border-color)}.filters mat-form-field{width:100%;min-width:0}.date-picker-field{width:100%;min-width:0}.filters button{height:56px;align-self:start;font-weight:900;border-radius:10px!important}.punch-row{display:grid;grid-template-columns:minmax(130px,.9fr) minmax(210px,1.4fr) minmax(110px,.7fr) minmax(110px,.7fr) minmax(80px,.5fr) minmax(130px,.9fr) minmax(120px,.8fr) minmax(180px,1fr);gap:12px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border-color);min-width:1120px}.unmatched{color:#b45309;font-weight:900}.empty{display:flex;min-height:170px;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--text-secondary)}.empty mat-icon{font-size:42px;width:42px;height:42px;color:var(--text-secondary)}.empty strong{color:var(--text-primary)}.pager{padding:12px 16px;border-top:1px solid var(--border-color)}.pager>div{display:flex;align-items:center;gap:10px}.pager span{color:var(--text-secondary)}
    @media(max-width:1200px){.filters{grid-template-columns:1fr 1fr}.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:900px){.upload-card{grid-template-columns:1fr}.upload-actions,.summary-title,.history-head,.records-head,.pager{align-items:stretch;flex-direction:column}.upload-actions button,.summary-actions button{width:100%}}
    @media(max-width:640px){.biometric-page{padding:18px}.page-header h1{font-size:34px}.filters,.summary-grid{grid-template-columns:1fr}.pager>div{align-items:stretch;flex-direction:column}}
  `],
})
export class AttendanceBiometricsPageComponent implements OnInit {
  file: File | null = null;
  isImporting = false;
  uploadProgress: number | null = null;
  imports: BiometricImport[] = [];
  lastImport: BiometricImport | null = null;
  punches: BiometricPunch[] = [];
  totalPunches = 0;
  totalPunchPages = 0;
  punchPage = 1;
  punchPageSize = 50;
  loadingPunches = false;
  punchQuery: BiometricPunchQuery = { page: 1, pageSize: 50, sortBy: 'date', sortDirection: 'desc' };
  punchDateFrom: Date | null = null;
  punchDateTo: Date | null = null;

  constructor(private hr: HrService, private snackbar: SnackbarService, private router: Router) {}

  ngOnInit(): void {
    this.loadImports();
    this.loadPunches();
  }

  onFile(event: Event): void {
    if (this.isImporting) return;
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
  }

  loadImports(): void {
    this.hr.getBiometricImports().subscribe({
      next: (x) => (this.imports = x),
      error: (e) => this.snackbar.error(this.error(e, 'No se pudieron cargar las importaciones.')),
    });
  }

  upload(): void {
    if (!this.file || this.isImporting) return;
    this.isImporting = true;
    this.uploadProgress = null;

    this.hr.importBiometricsWithProgress(this.file).pipe(finalize(() => (this.isImporting = false))).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round((event.loaded / event.total) * 100);
        }

        if (event.type === HttpEventType.Response && event.body) {
          this.lastImport = event.body;
          this.file = null;
          this.uploadProgress = null;
          this.snackbar.success('Importacion completada.');
          this.loadImports();
          this.showImportedRecords(event.body);
        }
      },
      error: (e) => {
        this.uploadProgress = null;
        this.snackbar.error(this.error(e, 'No se pudo importar el archivo.'));
      },
    });
  }

  showImportedRecords(item: BiometricImport): void {
    this.punchQuery.importId = item.id;
    this.punchDateFrom = this.inputDate(item.periodFrom);
    this.punchDateTo = this.inputDate(item.periodTo);
    this.applyPunchFilters();
  }

  applyPunchFilters(): void {
    this.punchPage = 1;
    this.loadPunches();
  }

  loadPunches(): void {
    this.loadingPunches = true;
    this.hr.getBiometricPunches({
      ...this.punchQuery,
      dateFrom: toIsoDate(this.punchDateFrom),
      dateTo: toIsoDate(this.punchDateTo),
      page: this.punchPage,
      pageSize: this.punchPageSize,
    })
      .pipe(finalize(() => (this.loadingPunches = false)))
      .subscribe({
        next: (x) => {
          this.punches = x.items;
          this.totalPunches = x.totalItems;
          this.totalPunchPages = x.totalPages;
          this.punchPage = x.page;
        },
        error: (e) => this.snackbar.error(this.error(e, 'No se pudieron cargar los registros importados.')),
      });
  }

  changePunchPage(delta: number): void {
    const next = this.punchPage + delta;
    if (next < 1 || (this.totalPunchPages && next > this.totalPunchPages)) return;
    this.punchPage = next;
    this.loadPunches();
  }

  goToLastWeek(item: BiometricImport): void {
    if (!item.lastPunchAt) return;
    const date = new Date(item.lastPunchAt);
    const week = this.weekNumber(date);
    this.router.navigate(['/rh/incidencias/semanas'], { queryParams: { year: date.getFullYear(), week } });
  }

  periodLabel(item: BiometricImport): string {
    if (!item.periodFrom || !item.periodTo) return 'Sin periodo';
    return `${this.dateLabel(item.periodFrom)} - ${this.dateLabel(item.periodTo)}`;
  }

  rangeLabel(): string {
    if (!this.totalPunches) return '0';
    const start = (this.punchPage - 1) * this.punchPageSize + 1;
    const end = Math.min(this.totalPunches, this.punchPage * this.punchPageSize);
    return `${start}-${end}`;
  }

  statusLabel(status: string): string {
    const value = (status || '').toUpperCase();
    if (value === 'SUCCESS') return 'COMPLETADO';
    if (value === 'PROCESSING') return 'PROCESANDO';
    if (value === 'FAILED') return 'FALLIDO';
    return value || 'SIN ESTADO';
  }

  trackImport(_: number, item: BiometricImport): number { return item.id; }
  trackPunch(_: number, item: BiometricPunch): number { return item.id; }

  private inputDate(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private dateLabel(value: string): string {
    return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private weekNumber(date: Date): number {
    const jan1 = new Date(date.getFullYear(), 0, 1);
    const firstSunday = new Date(jan1);
    firstSunday.setDate(jan1.getDate() - jan1.getDay());
    return Math.floor((date.getTime() - firstSunday.getTime()) / 604800000) + 1;
  }

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
