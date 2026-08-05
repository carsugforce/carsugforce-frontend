import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export type PurchasePaymentForm =
  | 'EFECTIVO'
  | 'SPEI'
  | 'DEBITO'
  | 'ESPECIE'
  | 'CXC';

export type PurchaseBank =
  | 'BBVA'
  | 'BANORTE'
  | 'INBURSA'
  | null;

export interface PurchasePaymentDialogData {
  total: number;

  // Para edición
  paymentForm?: PurchasePaymentForm | string | null;
  bank?: PurchaseBank | string | null;
  paymentReference?: string | null;
}

export interface PurchasePaymentDialogResult {
  paymentForm: PurchasePaymentForm;
  bank: PurchaseBank;
  paymentReference: string | null;
}

@Component({
  selector: 'app-purchase-payment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './purchase-payment-dialog.component.html',
  styleUrl: './purchase-payment-dialog.component.scss'
})
export class PurchasePaymentDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<PurchasePaymentDialogComponent>);

  form: FormGroup = this.fb.group({
    paymentForm: ['EFECTIVO', Validators.required],
    bank: [null],
    paymentReference: ['']
  });

  paymentOptions = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'SPEI', label: 'SPEI' },
    { value: 'DEBITO', label: 'Débito' },
    { value: 'ESPECIE', label: 'Especie' },
    { value: 'CXC', label: 'CxC' }
  ];

  bankOptions = [
    { value: 'BBVA', label: 'BBVA' },
    { value: 'BANORTE', label: 'Banorte' },
    { value: 'INBURSA', label: 'Inbursa' }
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PurchasePaymentDialogData
  ) {
    this.patchInitialValues();

    this.form.get('paymentForm')?.valueChanges.subscribe(value => {
      this.applyBankRules(value);
    });

    this.applyBankRules(this.form.get('paymentForm')?.value);
  }

  get requiresBank(): boolean {
    const value = this.form.get('paymentForm')?.value;
    return value === 'SPEI' || value === 'DEBITO';
  }

  private patchInitialValues(): void {
    const paymentForm = this.normalizePaymentForm(this.data?.paymentForm);
    const bank = this.normalizeBank(this.data?.bank);

    this.form.patchValue(
      {
        paymentForm,
        bank,
        paymentReference: this.data?.paymentReference || ''
      },
      { emitEvent: false }
    );
  }

  private normalizePaymentForm(value: string | null | undefined): PurchasePaymentForm {
    const normalized = String(value || '').trim().toUpperCase();

    if (normalized === 'SPEI') return 'SPEI';
    if (normalized === 'DEBITO') return 'DEBITO';
    if (normalized === 'ESPECIE') return 'ESPECIE';
    if (normalized === 'CXC') return 'CXC';

    return 'EFECTIVO';
  }

  private normalizeBank(value: string | null | undefined): PurchaseBank {
    const normalized = String(value || '').trim().toUpperCase();

    if (normalized === 'BBVA') return 'BBVA';
    if (normalized === 'BANORTE') return 'BANORTE';
    if (normalized === 'INBURSA') return 'INBURSA';

    return null;
  }

  private applyBankRules(paymentForm: string): void {
    const bankCtrl = this.form.get('bank');

    if (!bankCtrl) return;

    if (paymentForm === 'SPEI' || paymentForm === 'DEBITO') {
      bankCtrl.setValidators([Validators.required]);
    } else {
      bankCtrl.clearValidators();
      bankCtrl.setValue(null, { emitEvent: false });
    }

    bankCtrl.updateValueAndValidity({ emitEvent: false });
  }

  close(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const result: PurchasePaymentDialogResult = {
      paymentForm: raw.paymentForm,
      bank: raw.bank,
      paymentReference: (raw.paymentReference || '').trim() || null
    };

    this.dialogRef.close(result);
  }
}