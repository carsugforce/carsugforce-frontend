import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { SnackbarService } from '../../../core/service/snackbar.service';
import { finalize } from 'rxjs';

import {
  PnlExpenseReport,
  PnlExpenseReportQuery,
  PnlExpenseReportRow,
  PnlService,
} from '../../../core/service/pnl.service';

import { SucursalService } from '../../../core/service/sucursales.service';
import { SucursalSimple } from '../../../core/models/sucursalsimple.model';

@Component({
  selector: 'app-pnl-expense-report-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './pnl-expense-report-page.component.html',
  styleUrl: './pnl-expense-report-page.component.scss',
})
export class PnlExpenseReportPageComponent implements OnInit {
  loadingPreview = false;
  downloading = false;
  loadingSucursales = false;

  report: PnlExpenseReport | null = null;
  sucursales: SucursalSimple[] = [];

  expandedKeys = new Set<string>();
  private parentKeys = new Set<string>();

  readonly months = [
    { value: 1, label: 'Enero', short: 'ENE' },
    { value: 2, label: 'Febrero', short: 'FEB' },
    { value: 3, label: 'Marzo', short: 'MAR' },
    { value: 4, label: 'Abril', short: 'ABR' },
    { value: 5, label: 'Mayo', short: 'MAY' },
    { value: 6, label: 'Junio', short: 'JUN' },
    { value: 7, label: 'Julio', short: 'JUL' },
    { value: 8, label: 'Agosto', short: 'AGO' },
    { value: 9, label: 'Septiembre', short: 'SEP' },
    { value: 10, label: 'Octubre', short: 'OCT' },
    { value: 11, label: 'Noviembre', short: 'NOV' },
    { value: 12, label: 'Diciembre', short: 'DIC' },
  ];

  readonly years = [2025, 2026, 2027, 2028];

  readonly form = this.fb.group({
    year: [2026, Validators.required],
    startMonth: [4, Validators.required],
    endMonth: [8, Validators.required],
    sucursalesId: [null as number | null],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly pnlService: PnlService,
    private readonly sucursalService: SucursalService,
    private snackbar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.loadSucursales();
  }

  get query(): PnlExpenseReportQuery {
    const raw = this.form.getRawValue();

    return {
      year: Number(raw.year),
      startMonth: Number(raw.startMonth),
      endMonth: Number(raw.endMonth),
      sucursalesId: raw.sucursalesId ?? null,
    };
  }

  get canRun(): boolean {
    const query = this.query;

    return Boolean(
      query.year &&
      query.startMonth &&
      query.endMonth &&
      query.endMonth >= query.startMonth,
    );
  }

  get netSalesAccumulated(): number {
    const row = this.report?.rows.find(
      (item) => item.key === 'INGRESOS|VENTAS_NETAS',
    );

    return row?.accumulated ?? 0;
  }

  get totalIncomeAccumulated(): number {
    const row = this.report?.rows.find((item) => item.key === 'INGRESOS');

    return row?.accumulated ?? 0;
  }

  get totalExpensesAccumulated(): number {
    const row = this.report?.rows.find((item) => item.key === 'EGRESOS');

    return row?.accumulated ?? 0;
  }

  get periodResultAccumulated(): number {
    const row = this.report?.rows.find(
      (item) => item.key === 'RESULTADO_PERIODO',
    );

    return row?.accumulated ?? 0;
  }

  get selectedSucursalName(): string {
    const sucursalesId = this.form.controls.sucursalesId.value;

    if (sucursalesId === null || sucursalesId === undefined) {
      return 'Todas';
    }

    return (
      this.sucursales.find((sucursal) => sucursal.id === sucursalesId)
        ?.description ?? 'Sucursal seleccionada'
    );
  }

  get visibleRows(): PnlExpenseReportRow[] {
    const rows = this.report?.rows ?? [];

    return rows.filter((row) => this.isRowVisible(row));
  }

  preview(): void {
    if (!this.canRun) {
      this.snackbar.warning('Selecciona un rango de meses válido.');
      return;
    }

    this.loadingPreview = true;

    this.pnlService
      .previewExpenseReport(this.query)
      .pipe(finalize(() => (this.loadingPreview = false)))
      .subscribe({
        next: (report) => {
          this.report = report;
          this.configureHierarchy(report.rows);
        },
        error: () => {
          this.snackbar.error('No se pudo generar la vista previa.');
        },
      });
  }

  downloadExcel(): void {
    if (!this.canRun) {
      this.snackbar.warning('Selecciona un rango de meses válido.');
      return;
    }

    this.downloading = true;

    this.pnlService
      .downloadExpenseReportExcel(this.query)
      .pipe(finalize(() => (this.downloading = false)))
      .subscribe({
        next: (response) => {
          const blob = response.body;

          if (!blob) {
            this.snackbar.error('El archivo llegó vacío.');
            return;
          }

          const fileName =
            this.getFileNameFromResponse(
              response.headers.get('content-disposition'),
            ) ?? this.buildDefaultFileName();

          this.saveBlob(blob, fileName);

          this.snackbar.success('Reporte descargado correctamente.');
        },
        error: () => {
          this.snackbar.error('No se pudo descargar el Excel.');
        },
      });
  }

  hasChildren(row: PnlExpenseReportRow): boolean {
    return this.parentKeys.has(row.key);
  }

  isExpanded(row: PnlExpenseReportRow): boolean {
    return this.expandedKeys.has(row.key);
  }

  toggleRow(row: PnlExpenseReportRow): void {
    if (!this.hasChildren(row)) {
      return;
    }

    const nextKeys = new Set(this.expandedKeys);

    if (nextKeys.has(row.key)) {
      nextKeys.delete(row.key);
    } else {
      nextKeys.add(row.key);
    }

    this.expandedKeys = nextKeys;
  }

  expandAll(): void {
    this.expandedKeys = new Set(this.parentKeys);
  }

  collapseAll(): void {
    const root = this.report?.rows.find((row) => row.level === 0);

    this.expandedKeys = root
      ? new Set<string>([root.key])
      : new Set<string>();
  }

  getAmount(row: PnlExpenseReportRow, month: number): number {
    return (
      row.amountsByMonth?.[month] ??
      row.amountsByMonth?.[String(month)] ??
      0
    );
  }

  getRowClass(row: PnlExpenseReportRow): string {
    return [
      `level-${row.level}`,
      row.isHeader ? 'is-header' : 'is-detail',
      this.hasChildren(row) ? 'has-children' : '',
      row.key === 'INGRESOS' ? 'section-income' : '',
      row.key === 'EGRESOS' ? 'section-expense' : '',
      row.key === 'RESULTADO_PERIODO' ? 'section-result' : '',
      row.source === 'UNCLASSIFIED' ? 'unclassified-row' : '',
      row.source === 'SALES' ? 'sales-row' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  getSelectedMonthLabel(monthValue: number | null | undefined): string {
    const month = this.months.find((item) => item.value === monthValue);
    return month?.label ?? '-';
  }

  trackByRowKey(
    _index: number,
    row: PnlExpenseReportRow,
  ): string {
    return row.key;
  }

  formatMoney(value: number | null | undefined): string {
    const amount = Number(value ?? 0);

    if (amount === 0) {
      return '-';
    }

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private loadSucursales(): void {
    this.loadingSucursales = true;

    this.sucursalService
      .getAllSucursalesSimple()
      .pipe(finalize(() => (this.loadingSucursales = false)))
      .subscribe({
        next: (sucursales) => {
          this.sucursales = [...(sucursales ?? [])].sort((a, b) =>
            a.description.localeCompare(b.description, 'es'),
          );
        },
        error: () => {
          this.snackbar.error('No se pudieron cargar las UEN/Sucursales.');
        },
      });
  }

  private configureHierarchy(rows: PnlExpenseReportRow[]): void {
    this.parentKeys = new Set<string>();

    rows.forEach((row, index) => {
      const nextRow = rows[index + 1];

      if (nextRow && nextRow.level > row.level) {
        this.parentKeys.add(row.key);
      }
    });

    this.expandAll();
  }

  private isRowVisible(row: PnlExpenseReportRow): boolean {
    const keyParts = row.key.split('|');

    for (let index = 1; index < keyParts.length; index++) {
      const ancestorKey = keyParts.slice(0, index).join('|');

      if (
        this.parentKeys.has(ancestorKey) &&
        !this.expandedKeys.has(ancestorKey)
      ) {
        return false;
      }
    }

    return true;
  }

  private buildDefaultFileName(): string {
    const query = this.query;

    return `estado-resultados-pnl-${query.year}-${String(
      query.startMonth,
    ).padStart(2, '0')}-a-${String(query.endMonth).padStart(2, '0')}.xlsx`;
  }

  private getFileNameFromResponse(
    contentDisposition: string | null,
  ): string | null {
    if (!contentDisposition) {
      return null;
    }

    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);

    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const regularMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);

    return regularMatch?.[1] ?? null;
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = fileName;
    anchor.click();

    window.URL.revokeObjectURL(url);
  }
}