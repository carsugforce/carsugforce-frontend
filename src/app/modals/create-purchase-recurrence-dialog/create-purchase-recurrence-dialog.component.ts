import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { SnackbarService } from '../../core/service/snackbar.service';
import { PurchaseListItem } from '../../core/service/purchases.service';
import {
  CreatePurchaseRecurrenceRequest,
  PurchaseRecurrencesService,
  PurchaseRecurrenceFrequencyType,
} from '../../core/service/purchase-recurrences.service';

interface CreatePurchaseRecurrenceDialogData {
  purchase: PurchaseListItem;
}

@Component({
  selector: 'app-create-purchase-recurrence-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './create-purchase-recurrence-dialog.component.html',
  styleUrl: './create-purchase-recurrence-dialog.component.scss',
})
export class CreatePurchaseRecurrenceDialogComponent {
  private fb = inject(FormBuilder);
  private snackbar = inject(SnackbarService);
  private purchaseRecurrencesService = inject(PurchaseRecurrencesService);

  saving = false;

  frequencyOptions: {
    value: PurchaseRecurrenceFrequencyType;
    label: string;
  }[] = [
    { value: 'DAYS', label: 'Días' },
    { value: 'WEEKS', label: 'Semanas' },
    { value: 'MONTHS', label: 'Meses' },
  ];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    frequencyType: [
      'MONTHS' as PurchaseRecurrenceFrequencyType,
      Validators.required,
    ],
    frequencyInterval: [
      2,
      [Validators.required, Validators.min(1), Validators.max(120)],
    ],
    startDate: ['', Validators.required],
    nextRunDate: ['', Validators.required],
    endDate: [null as string | null],
    notes: ['', Validators.maxLength(500)],
  });

  constructor(
    private dialogRef: MatDialogRef<CreatePurchaseRecurrenceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreatePurchaseRecurrenceDialogData,
  ) {
    const today = this.toInputDate(new Date());
    const nextDate = this.toInputDate(this.addMonths(new Date(), 2));

    const purchase = this.data.purchase;

    this.form.patchValue(
      {
        name: this.buildDefaultName(purchase),
        frequencyType: 'MONTHS',
        frequencyInterval: 2,
        startDate: today,
        nextRunDate: nextDate,
        endDate: null,
        notes: '',
      },
      { emitEvent: false },
    );

    this.form.get('frequencyType')?.valueChanges.subscribe(() => {
      this.recalculateNextRunDate();
    });

    this.form.get('frequencyInterval')?.valueChanges.subscribe(() => {
      this.recalculateNextRunDate();
    });

    this.form.get('startDate')?.valueChanges.subscribe(() => {
      this.recalculateNextRunDate();
    });
  }

  get purchase(): PurchaseListItem {
    return this.data.purchase;
  }

  get frequencyText(): string {
    const raw = this.form.getRawValue();
    const interval = Number(raw.frequencyInterval || 0);
    const type = raw.frequencyType;

    if (!interval || !type) return 'Configura la frecuencia';

    if (type === 'DAYS') {
      return interval === 1 ? 'Cada día' : `Cada ${interval} días`;
    }

    if (type === 'WEEKS') {
      return interval === 1 ? 'Cada semana' : `Cada ${interval} semanas`;
    }

    return interval === 1 ? 'Cada mes' : `Cada ${interval} meses`;
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const startDate = this.parseInputDate(String(raw.startDate));
    const nextRunDate = this.parseInputDate(String(raw.nextRunDate));

    if (nextRunDate < startDate) {
      this.snackbar.warning(
        'La próxima generación no puede ser menor a la fecha de inicio.',
      );
      return;
    }

    const payload: CreatePurchaseRecurrenceRequest = {
      sourcePurchaseId: this.purchase.id,
      name: String(raw.name || '').trim(),
      frequencyType: raw.frequencyType as PurchaseRecurrenceFrequencyType,
      frequencyInterval: Number(raw.frequencyInterval || 1),
      startDate: String(raw.startDate),
      nextRunDate: String(raw.nextRunDate),
      endDate: raw.endDate || null,
      notes: String(raw.notes || '').trim() || null,
    };

    this.saving = true;

    this.purchaseRecurrencesService
      .create(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (created) => {
          this.snackbar.success('Compra recurrente creada correctamente.');
          this.dialogRef.close({
            created: true,
            recurrence: created,
          });
        },
        error: (err) => {
          this.snackbar.error(
            this.getErrorMessage(err, 'No se pudo crear la compra recurrente.'),
          );
        },
      });
  }

  close(): void {
    if (this.saving) return;
    this.dialogRef.close();
  }

  private recalculateNextRunDate(): void {
    const raw = this.form.getRawValue();

    if (!raw.startDate || !raw.frequencyType || !raw.frequencyInterval) return;

    const start = this.parseInputDate(raw.startDate);
    const interval = Number(raw.frequencyInterval || 1);
    const type = raw.frequencyType;

    let next = new Date(start);

    if (type === 'DAYS') {
      next.setDate(next.getDate() + interval);
    } else if (type === 'WEEKS') {
      next.setDate(next.getDate() + interval * 7);
    } else {
      next = this.addMonths(next, interval);
    }

    this.form.patchValue(
      {
        nextRunDate: this.toInputDate(next),
      },
      { emitEvent: false },
    );
  }

  private buildDefaultName(purchase: PurchaseListItem): string {
    const supplier = purchase.supplierName || 'Proveedor';
    return `${supplier} recurrente`;
  }

  private addMonths(date: Date, months: number): Date {
    const copy = new Date(date);
    copy.setMonth(copy.getMonth() + months);
    return copy;
  }

  private parseInputDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
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
}
