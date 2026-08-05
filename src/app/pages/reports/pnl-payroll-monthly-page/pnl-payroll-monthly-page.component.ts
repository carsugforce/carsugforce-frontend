import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PnlService } from '../../../core/service/pnl.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  selector: 'app-pnl-payroll-monthly-page',
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
  ],
  templateUrl: './pnl-payroll-monthly-page.component.html',
  styleUrl: './pnl-payroll-monthly-page.component.scss',
})
export class PnlPayrollMonthlyPageComponent implements OnInit {
  loading = false;
  saving = false;

  months = [
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

  years = [2025, 2026, 2027];

  form = this.fb.group({
    year: [2026, Validators.required],
    month: [1, Validators.required],
    sucursalesId: [null as number | null],

    regularPayroll: [0],
    vacations: [0],
    vacationBonus: [0],
    christmasBonus: [0],
    severancePayments: [0],
    terminationPayments: [0],
    decemberExpenseProvision: [0],
    payrollTax: [0],
    imssInfonavit: [0],

    notes: [''],
  });

  constructor(
    private fb: FormBuilder,
    private pnlService: PnlService,
     private snackbar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.loadPayroll();

    this.form.get('year')?.valueChanges.subscribe(() => this.loadPayroll());
    this.form.get('month')?.valueChanges.subscribe(() => this.loadPayroll());
    this.form
      .get('sucursalesId')
      ?.valueChanges.subscribe(() => this.loadPayroll());
  }

  get totalPayroll(): number {
    const raw = this.form.getRawValue();

    return (
      Number(raw.regularPayroll || 0) +
      Number(raw.vacations || 0) +
      Number(raw.vacationBonus || 0) +
      Number(raw.christmasBonus || 0) +
      Number(raw.severancePayments || 0) +
      Number(raw.terminationPayments || 0) +
      Number(raw.decemberExpenseProvision || 0) +
      Number(raw.payrollTax || 0) +
      Number(raw.imssInfonavit || 0)
    );
  }

  loadPayroll(): void {
    const year = this.form.value.year;
    const month = this.form.value.month;
    const sucursalesId = this.form.value.sucursalesId ?? null;

    if (!year || !month) return;

    this.loading = true;

    this.pnlService.getMonthlyPayroll(year, month, sucursalesId).subscribe({
      next: (result) => {
        this.loading = false;

        if (!result) {
          this.resetAmountsOnly();
          return;
        }

        this.form.patchValue(
          {
            regularPayroll: result.regularPayroll,
            vacations: result.vacations,
            vacationBonus: result.vacationBonus,
            christmasBonus: result.christmasBonus,
            severancePayments: result.severancePayments,
            terminationPayments: result.terminationPayments,
            decemberExpenseProvision: result.decemberExpenseProvision,
            payrollTax: result.payrollTax,
            imssInfonavit: result.imssInfonavit,
            notes: result.notes ?? '',
          },
          { emitEvent: false },
        );
      },
      error: () => {
        this.loading = false;
        this.snackbar.error('No se pudo cargar la nómina mensual.');
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.saving = true;

    this.pnlService
      .saveMonthlyPayroll({
        year: raw.year!,
        month: raw.month!,
        sucursalesId: raw.sucursalesId ?? null,

        regularPayroll: Number(raw.regularPayroll || 0),
        vacations: Number(raw.vacations || 0),
        vacationBonus: Number(raw.vacationBonus || 0),
        christmasBonus: Number(raw.christmasBonus || 0),
        severancePayments: Number(raw.severancePayments || 0),
        terminationPayments: Number(raw.terminationPayments || 0),
        decemberExpenseProvision: Number(raw.decemberExpenseProvision || 0),
        payrollTax: Number(raw.payrollTax || 0),
        imssInfonavit: Number(raw.imssInfonavit || 0),

        notes: raw.notes || null,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.snackbar.success(
            'Nómina mensual guardada correctamente.',
           
          );
        },
        error: () => {
          this.saving = false;
          this.snackbar.error('No se pudo guardar la nómina mensual.')
        },
      });
  }

  private resetAmountsOnly(): void {
    this.form.patchValue(
      {
        regularPayroll: 0,
        vacations: 0,
        vacationBonus: 0,
        christmasBonus: 0,
        severancePayments: 0,
        terminationPayments: 0,
        decemberExpenseProvision: 0,
        payrollTax: 0,
        imssInfonavit: 0,
        notes: '',
      },
      { emitEvent: false },
    );
  }

  getSelectedMonthLabel(): string {
    const month = this.months.find((x) => x.value === this.form.value.month);
    return month?.label ?? 'Sin mes';
  }

  getSelectedSucursalLabel(): string {
    const value = this.form.value.sucursalesId;

    if (!value) {
      return 'Todas';
    }

    return `Sucursal ${value}`;
  }
}
