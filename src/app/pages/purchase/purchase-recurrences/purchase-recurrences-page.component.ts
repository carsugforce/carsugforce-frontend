import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  PurchaseRecurrencesService,
  PurchaseRecurrenceListItem,
} from '../../../core/service/purchase-recurrences.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

type RecurrenceQuickFilter =
  | 'ALL'
  | 'ACTIVE'
  | 'PAUSED'
  | 'OVERDUE'
  | 'SOON_7'
  | 'SOON_30';

@Component({
  selector: 'app-purchase-recurrences-page',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,

    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './purchase-recurrences-page.component.html',
  styleUrl: './purchase-recurrences-page.component.scss',
})
export class PurchaseRecurrencesPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private purchaseRecurrencesService = inject(PurchaseRecurrencesService);
  private snackbar = inject(SnackbarService);
  private dialog = inject(MatDialog);

  loading = false;
  generatingId: number | null = null;
  togglingId: number | null = null;

  recurrences: PurchaseRecurrenceListItem[] = [];

  activeQuickFilter: RecurrenceQuickFilter = 'ALL';

  filtersForm = this.fb.group({
    search: [''],
    frequencyType: [null as string | null],
    nextRunFrom: [null as string | null],
    nextRunTo: [null as string | null],
  });

  ngOnInit(): void {
    this.loadRecurrences();

    this.filtersForm
      .get('search')
      ?.valueChanges.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        // El getter filteredRecurrences recalcula automáticamente.
      });
  }

  get activeCount(): number {
    return this.recurrences.filter((x) => x.isActive).length;
  }

  get pausedCount(): number {
    return this.recurrences.filter((x) => !x.isActive).length;
  }

  get dueSoonCount(): number {
    const today = this.startOfDay(new Date());
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 7);

    return this.recurrences.filter((x) => {
      if (!x.isActive || !x.nextRunDate) return false;

      const next = this.startOfDay(new Date(x.nextRunDate));
      return next >= today && next <= limit;
    }).length;
  }

  get hasFilters(): boolean {
    const raw = this.filtersForm.getRawValue();

    return !!(
      raw.search ||
      raw.frequencyType ||
      raw.nextRunFrom ||
      raw.nextRunTo ||
      this.activeQuickFilter !== 'ALL'
    );
  }

  get filteredRecurrences(): PurchaseRecurrenceListItem[] {
    const raw = this.filtersForm.getRawValue();

    const search = String(raw.search || '')
      .trim()
      .toUpperCase();
    const frequencyType = String(raw.frequencyType || '')
      .trim()
      .toUpperCase();
    const nextRunFrom = raw.nextRunFrom
      ? this.startOfDay(this.parseInputDate(raw.nextRunFrom))
      : null;
    const nextRunTo = raw.nextRunTo
      ? this.startOfDay(this.parseInputDate(raw.nextRunTo))
      : null;

    let result = [...this.recurrences];

    if (search) {
      result = result.filter((item) => {
        const haystack = [
          item.name,
          item.supplierName,
          item.sourceFolio,
          item.lastGeneratedPurchaseFolio,
          item.notes,
          item.frequencyType,
        ]
          .filter(Boolean)
          .join(' ')
          .toUpperCase();

        return haystack.includes(search);
      });
    }

    if (frequencyType) {
      result = result.filter(
        (item) =>
          String(item.frequencyType || '').toUpperCase() === frequencyType,
      );
    }

    if (nextRunFrom) {
      result = result.filter((item) => {
        if (!item.nextRunDate) return false;

        return this.startOfDay(new Date(item.nextRunDate)) >= nextRunFrom;
      });
    }

    if (nextRunTo) {
      result = result.filter((item) => {
        if (!item.nextRunDate) return false;

        return this.startOfDay(new Date(item.nextRunDate)) <= nextRunTo;
      });
    }

    return this.applyQuickFilterToList(result);
  }

  loadRecurrences(): void {
    this.loading = true;

    this.purchaseRecurrencesService
      .getAll()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (items) => {
          this.recurrences = items || [];
        },
        error: (err) => {
          this.recurrences = [];
          this.snackbar.error(
            this.getErrorMessage(
              err,
              'No se pudieron cargar las compras recurrentes.',
            ),
          );
        },
      });
  }

  applyQuickFilter(filter: RecurrenceQuickFilter): void {
    this.activeQuickFilter = filter;
  }

  clearFilters(): void {
    this.activeQuickFilter = 'ALL';

    this.filtersForm.reset({
      search: '',
      frequencyType: null,
      nextRunFrom: null,
      nextRunTo: null,
    });
  }

  toggle(recurrence: PurchaseRecurrenceListItem): void {
    if (!recurrence?.id || this.togglingId) return;

    this.togglingId = recurrence.id;

    this.purchaseRecurrencesService
      .toggle(recurrence.id)
      .pipe(finalize(() => (this.togglingId = null)))
      .subscribe({
        next: (updated) => {
          this.recurrences = this.recurrences.map((item) =>
            item.id === updated.id ? updated : item,
          );

          this.snackbar.success(
            updated.isActive
              ? 'Recurrencia activada correctamente.'
              : 'Recurrencia pausada correctamente.',
          );
        },
        error: (err) => {
          this.snackbar.error(
            this.getErrorMessage(err, 'No se pudo actualizar la recurrencia.'),
          );
        },
      });
  }

  generateNext(recurrence: PurchaseRecurrenceListItem): void {
    if (!recurrence?.id || this.generatingId) return;

    this.dialog
      .open(ConfirmDialogComponent, {
        width: '390px',
        data: {
          type: 'warning',
          title: 'Generar compra recurrente',
          message: `Se generará una nueva compra de "${recurrence.name}" con fecha ${this.formatDateForMessage(recurrence.nextRunDate)}. ¿Deseas continuar?`,
          showCancel: true,
          confirmText: 'Generar',
          cancelText: 'Cancelar',
        },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;

        this.generatingId = recurrence.id;

        this.purchaseRecurrencesService
          .generateNext(recurrence.id)
          .pipe(finalize(() => (this.generatingId = null)))
          .subscribe({
            next: (res) => {
              this.snackbar.success(
                res?.message || 'Compra generada correctamente.',
              );

              this.loadRecurrences();
            },
            error: (err) => {
              this.snackbar.error(
                this.getErrorMessage(
                  err,
                  'No se pudo generar la siguiente compra.',
                ),
              );
            },
          });
      });
  }

  getFrequencyLabel(recurrence: PurchaseRecurrenceListItem): string {
    const interval = Number(recurrence.frequencyInterval || 0);
    const type = String(recurrence.frequencyType || '').toUpperCase();

    if (!interval || !type) return 'Sin frecuencia';

    if (type === 'DAYS') {
      return interval === 1 ? 'Cada día' : `Cada ${interval} días`;
    }

    if (type === 'WEEKS') {
      return interval === 1 ? 'Cada semana' : `Cada ${interval} semanas`;
    }

    if (type === 'MONTHS') {
      return interval === 1 ? 'Cada mes' : `Cada ${interval} meses`;
    }

    return 'Sin frecuencia';
  }

  getStatusLabel(recurrence: PurchaseRecurrenceListItem): string {
    return recurrence.isActive ? 'Activa' : 'Pausada';
  }

  getNextRunLabel(recurrence: PurchaseRecurrenceListItem): string {
    if (!recurrence.nextRunDate) return 'Sin fecha';

    const today = this.startOfDay(new Date());
    const next = this.startOfDay(new Date(recurrence.nextRunDate));

    const diffMs = next.getTime() - today.getTime();
    const days = Math.round(diffMs / 86400000);

    if (days < 0) {
      return `Vencida hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`;
    }

    if (days === 0) return 'Se genera hoy';
    if (days === 1) return 'Mañana';

    return `En ${days} días`;
  }

  getNextRunClass(recurrence: PurchaseRecurrenceListItem): string {
    if (!recurrence.isActive) return 'paused';

    if (!recurrence.nextRunDate) return 'neutral';

    const today = this.startOfDay(new Date());
    const next = this.startOfDay(new Date(recurrence.nextRunDate));

    const diffMs = next.getTime() - today.getTime();
    const days = Math.round(diffMs / 86400000);

    if (days < 0) return 'overdue';
    if (days <= 7) return 'soon';

    return 'ok';
  }

  private applyQuickFilterToList(
    items: PurchaseRecurrenceListItem[],
  ): PurchaseRecurrenceListItem[] {
    const today = this.startOfDay(new Date());

    const plus7 = new Date(today);
    plus7.setDate(plus7.getDate() + 7);

    const plus30 = new Date(today);
    plus30.setDate(plus30.getDate() + 30);

    if (this.activeQuickFilter === 'ACTIVE') {
      return items.filter((x) => x.isActive);
    }

    if (this.activeQuickFilter === 'PAUSED') {
      return items.filter((x) => !x.isActive);
    }

    if (this.activeQuickFilter === 'OVERDUE') {
      return items.filter((x) => {
        if (!x.isActive || !x.nextRunDate) return false;

        return this.startOfDay(new Date(x.nextRunDate)) < today;
      });
    }

    if (this.activeQuickFilter === 'SOON_7') {
      return items.filter((x) => {
        if (!x.isActive || !x.nextRunDate) return false;

        const next = this.startOfDay(new Date(x.nextRunDate));
        return next >= today && next <= plus7;
      });
    }

    if (this.activeQuickFilter === 'SOON_30') {
      return items.filter((x) => {
        if (!x.isActive || !x.nextRunDate) return false;

        const next = this.startOfDay(new Date(x.nextRunDate));
        return next >= today && next <= plus30;
      });
    }

    return items;
  }

  private parseInputDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private getErrorMessage(err: any, fallback: string): string {
    if (typeof err?.error === 'string' && err.error.trim()) {
      return err.error;
    }

    if (typeof err?.error?.message === 'string' && err.error.message.trim()) {
      return err.error.message;
    }

    return fallback;
  }

  private formatDateForMessage(value: string | null | undefined): string {
    if (!value) return 'sin fecha';

    const date = new Date(value);

    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
