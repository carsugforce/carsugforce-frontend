import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  SalesDatabaseResponse,
  SalesDatabaseRow,
  SalesDatabaseUenValues,
  SalesDatabaseVisibleUen,
  SalesService,
} from '../../../core/service/sales.service';

import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  selector: 'app-sales-database-page',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],

  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-MX',
    },
  ],

  templateUrl: './sales-database-page.component.html',

  styleUrl: './sales-database-page.component.scss',
})
export class SalesDatabasePageComponent implements OnInit {
  form!: FormGroup;

  loading = false;

  visibleUens: SalesDatabaseVisibleUen[] = [];

  rows: SalesDatabaseRow[] = [];

  constructor(
    private fb: FormBuilder,
    private salesService: SalesService,
    private snackbar: SnackbarService,
  ) {}

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
    const today = this.getToday();

    this.form = this.fb.group({
      uenKey: [null],

      dateFrom: [new Date(today.getFullYear(), today.getMonth(), 1)],

      dateTo: [today],
    });

    this.loadDatabase();
  }

  // ============================================================
  // LOAD DATABASE
  // ============================================================

  loadDatabase(): void {
    if (this.loading) {
      return;
    }

    const raw = this.form.getRawValue();

    const dateFrom = this.normalizeDate(raw.dateFrom);

    const dateTo = this.normalizeDate(raw.dateTo);

    if (dateFrom && dateTo && dateFrom > dateTo) {
      this.snackbar.error(
        'La fecha inicial no puede ser mayor a la fecha final.',
      );

      return;
    }

    this.loading = true;

    this.salesService
      .getDatabase({
        dateFrom: dateFrom ? this.toApiDate(dateFrom) : undefined,

        dateTo: dateTo ? this.toApiDate(dateTo) : undefined,
      })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (response: SalesDatabaseResponse) => {
          this.visibleUens = response.visibleUens || [];

          this.rows = response.rows || [];

          this.ensureSelectedUen();
        },

        error: (err) => {
          this.visibleUens = [];

          this.rows = [];

          this.form.patchValue(
            {
              uenKey: null,
            },
            {
              emitEvent: false,
            },
          );

          this.snackbar.error(
            this.getErrorMessage(
              err,
              'No se pudo consultar la base de datos de ventas.',
            ),
          );
        },
      });
  }

  // ============================================================
  // UEN
  // ============================================================

  private ensureSelectedUen(): void {
    const control = this.form.get('uenKey');

    // ==========================================================
    // SIN UEN AUTORIZADAS
    // ==========================================================

    if (this.visibleUens.length === 0) {
      control?.reset(null, {
        emitEvent: false,
      });

      control?.disable({
        emitEvent: false,
      });

      return;
    }

    // ==========================================================
    // UNA SOLA UEN
    //
    // AUTOSELECCIÓN + CANDADO
    // ==========================================================

    if (this.visibleUens.length === 1) {
      const uen = this.visibleUens[0];

      control?.enable({
        emitEvent: false,
      });

      control?.setValue(uen.key, {
        emitEvent: false,
      });

      control?.disable({
        emitEvent: false,
      });

      return;
    }

    // ==========================================================
    // DOS O MÁS UEN
    //
    // COMBO HABILITADO
    // ==========================================================

    control?.enable({
      emitEvent: false,
    });

    const currentKey = control?.value;

    const currentStillVisible = this.visibleUens.some(
      (x) => x.key === currentKey,
    );

    if (currentStillVisible) {
      return;
    }

    control?.setValue(this.visibleUens[0].key, {
      emitEvent: false,
    });
  }

  get selectedUenKey(): string | null {
    return this.form?.get('uenKey')?.value || null;
  }

  get selectedUen(): SalesDatabaseVisibleUen | null {
    const key = this.selectedUenKey;

    if (!key) {
      return null;
    }

    return this.visibleUens.find((x) => x.key === key) || null;
  }

  get selectedUenName(): string {
    return this.selectedUen?.name || 'Sin seleccionar';
  }

  get selectedIsMayoristas(): boolean {
    return this.selectedUenKey === 'mayoristas';
  }

  get uenLocked(): boolean {
    return this.visibleUens.length === 1;
  }

  getUenValues(
    row: SalesDatabaseRow,
    key: string | null,
  ): SalesDatabaseUenValues | null {
    if (!key) {
      return null;
    }

    switch (key) {
      case 'belisario':
        return row.belisario ?? null;

      case 'santaLucia':
        return row.santaLucia ?? null;

      case 'mayoristas':
        return row.mayoristas ?? null;

      default:
        return null;
    }
  }

  getSelectedValues(row: SalesDatabaseRow): SalesDatabaseUenValues | null {
    return this.getUenValues(row, this.selectedUenKey);
  }

  // ============================================================
  // FILAS VISIBLES
  // ============================================================

  get displayRows(): SalesDatabaseRow[] {
    if (!this.selectedUenKey) {
      return [];
    }

    return this.rows.filter((row) => this.getSelectedValues(row) !== null);
  }

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  clearFilters(): void {
    this.form.patchValue({
      dateFrom: null,
      dateTo: null,
    });

    this.loadDatabase();
  }

  // ============================================================
  // PRINT
  // ============================================================

  printReport(): void {
    if (!this.selectedUenKey) {
      this.snackbar.error('Selecciona una UEN antes de generar el reporte.');

      return;
    }

    if (this.displayRows.length === 0) {
      this.snackbar.error('No existen registros para generar el reporte.');

      return;
    }

    document.body.classList.add('sales-report-print-mode');

    const cleanup = () => {
      document.body.classList.remove('sales-report-print-mode');
    };

    window.addEventListener('afterprint', cleanup, {
      once: true,
    });

    setTimeout(() => {
      window.print();
    }, 100);
  }

  // ============================================================
  // FORMAT
  // ============================================================

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '--';
    }

    const date = this.parseApiDate(value);

    if (!date) {
      return '--';
    }

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  money(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  number(value: number | null | undefined, decimals = 0): string {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: decimals,

      maximumFractionDigits: decimals,
    }).format(Number(value || 0));
  }

  percentage(value: number | null | undefined): string {
    return `${this.number(Number(value || 0), 2)}%`;
  }

  // ============================================================
  // REPORT HEADER
  // ============================================================

  get reportDateFromText(): string {
    const value = this.normalizeDate(this.form?.get('dateFrom')?.value);

    if (!value) {
      return 'Inicio';
    }

    return this.formatLocalDate(value);
  }

  get reportDateToText(): string {
    const value = this.normalizeDate(this.form?.get('dateTo')?.value);

    if (!value) {
      return 'Actualidad';
    }

    return this.formatLocalDate(value);
  }

  get reportPeriodText(): string {
    return `${this.reportDateFromText}` + ` al ` + `${this.reportDateToText}`;
  }

  get generatedAtText(): string {
    const now = new Date();

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);
  }

  // ============================================================
  // HEADER
  // ============================================================

  get totalRows(): number {
    return this.displayRows.length;
  }

  get totalVisibleUens(): number {
    return this.visibleUens.length;
  }

  // ============================================================
  // RESUMEN UEN SELECCIONADA
  // ============================================================

  get cashSaleTotal(): number {
    return this.round(
      this.displayRows.reduce((total, row) => {
        const data = this.getSelectedValues(row);

        return total + Number(data?.realTotal || 0);
      }, 0),
    );
  }

  get creditSaleTotal(): number {
    return this.round(
      this.displayRows.reduce((total, row) => {
        const data = this.getSelectedValues(row);

        return total + Number(data?.creditAmount || 0);
      }, 0),
    );
  }

  get totalSale(): number {
    return this.round(this.cashSaleTotal + this.creditSaleTotal);
  }

  get totalTickets(): number {
    return this.displayRows.reduce((total, row) => {
      const data = this.getSelectedValues(row);

      if (!data) {
        return total;
      }

      return (
        total +
        Number(data.checksQuantity || 0) +
        Number(data.creditChecks || 0)
      );
    }, 0);
  }

  // ============================================================
  // REPORT TOTALS
  // ============================================================

  get totalSystem(): number {
    return this.sumSelected((data) => data.systemTotal);
  }

  get totalReal(): number {
    return this.sumSelected((data) => data.realTotal);
  }

  get totalVariation(): number {
    return this.sumSelected((data) => data.variation);
  }

  get totalCash(): number {
    return this.sumSelected((data) => data.cash);
  }

  get totalTpv(): number {
    return this.sumSelected((data) => data.tpv);
  }

  get totalSpei(): number {
    return this.sumSelected((data) => data.spei);
  }

  get totalCredit(): number {
    return this.sumSelected((data) => data.creditAmount);
  }

  get totalCollection(): number {
    return this.sumSelected((data) => data.collectionAmount);
  }

  get totalKilograms(): number {
    return this.sumSelected((data) => data.kilograms);
  }

  get totalPieces(): number {
    return Math.trunc(this.sumSelected((data) => data.pieces));
  }

  get totalCancelled(): number {
    return Math.trunc(this.sumSelected((data) => data.cancelledTotal));
  }

  private sumSelected(
    selector: (data: SalesDatabaseUenValues) => number,
  ): number {
    return this.round(
      this.displayRows.reduce((total, row) => {
        const data = this.getSelectedValues(row);

        if (!data) {
          return total;
        }

        return total + Number(selector(data) || 0);
      }, 0),
    );
  }

  // ============================================================
  // DATE HELPERS
  // ============================================================

  private getToday(): Date {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }

  private normalizeDate(value: unknown): Date | null {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return null;
      }

      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    return null;
  }

  private parseApiDate(value: string): Date | null {
    const onlyDate = value.trim().split('T')[0];

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(onlyDate);

    if (!match) {
      return null;
    }

    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  private formatLocalDate(value: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(value);
  }

  private toApiDate(date: Date): string {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // ============================================================
  // GENERAL HELPERS
  // ============================================================

  private round(value: number): number {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  // ============================================================
  // ERROR
  // ============================================================

  private getErrorMessage(err: any, fallback: string): string {
    if (typeof err?.error === 'string' && err.error.trim()) {
      return err.error;
    }

    if (typeof err?.error?.message === 'string' && err.error.message.trim()) {
      return err.error.message;
    }

    if (typeof err?.error?.title === 'string' && err.error.title.trim()) {
      return err.error.title;
    }

    return fallback;
  }
}
