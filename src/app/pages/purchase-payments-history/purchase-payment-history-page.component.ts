import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import {
  PurchasePaymentListItem,
  PurchasePaymentsService,
} from '../../core/service/purchase-payments.service';

import { SnackbarService } from '../../core/service/snackbar.service';
import { PurchasePaymentDetailDialogComponent } from '../../modals/purchase-payment-history/purchase-payment-detail-dialog.component';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PaymentComplementsDialogComponent } from '../../modals/payment-complements-dialog/payment-complements-dialog.component';



type PaymentQuickFilter = 'ALL' | 'ACTIVE' | 'CANCELLED' | 'TODAY' | 'WEEK' | 'MONTH';

@Component({
  selector: 'app-purchase-payment-history-page',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
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
  templateUrl: './purchase-payment-history-page.component.html',
  styleUrl: './purchase-payment-history-page.component.scss',
})
export class PurchasePaymentHistoryPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackbar = inject(SnackbarService);
  private purchasePaymentsService = inject(PurchasePaymentsService);

  loading = false;

  payments: PurchasePaymentListItem[] = [];

  total = 0;
  page = 1;
  pageSize = 20;

  activeQuickFilter: PaymentQuickFilter = 'ALL';

  filtersForm = this.fb.group({
    search: [''],
    dateFrom: [null as string | null],
    dateTo: [null as string | null],
    paymentForm: [null as string | null],
    isCancelled: [null as boolean | null],
  });

  paymentFormOptions = [
    { value: null, label: 'Todas' },
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'SPEI', label: 'SPEI' },
    { value: 'DEBITO', label: 'Débito' },
    { value: 'ESPECIE', label: 'Especie' },
    { value: 'CXC', label: 'CxC' },
  ];

  statusOptions = [
    { value: null, label: 'Todos' },
    { value: false, label: 'Activos' },
    { value: true, label: 'Cancelados' },
  ];

  ngOnInit(): void {
    this.loadPayments();

    this.filtersForm.get('search')?.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
      )
      .subscribe(() => {
        this.page = 1;
        this.loadPayments();
      });
  }

  get totalAmount(): number {
    return this.payments.reduce((acc, item) => acc + Number(item.totalAmount || 0), 0);
  }

  get totalFiles(): number {
    return this.payments.reduce((acc, item) => acc + Number(item.filesCount || 0), 0);
  }

  get totalPurchasesAffected(): number {
    return this.payments.reduce((acc, item) => acc + Number(item.purchasesCount || 0), 0);
  }

  get fromRecord(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  get hasNextPage(): boolean {
    return this.page * this.pageSize < this.total;
  }

  get hasFilters(): boolean {
    const raw = this.filtersForm.getRawValue();

    return !!(
      raw.search ||
      raw.dateFrom ||
      raw.dateTo ||
      raw.paymentForm ||
      raw.isCancelled !== null
    );
  }

  loadPayments(): void {
    this.loading = true;

    const raw = this.filtersForm.getRawValue();

    this.purchasePaymentsService
      .getPaymentsHistory({
        search: raw.search?.trim() || null,
        dateFrom: raw.dateFrom,
        dateTo: raw.dateTo,
        paymentForm: raw.paymentForm,
        isCancelled: raw.isCancelled,
        page: this.page,
        pageSize: this.pageSize,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.payments = res.items || [];
          this.total = res.total || 0;
          this.page = res.page || this.page;
          this.pageSize = res.pageSize || this.pageSize;
        },
        error: () => {
          this.payments = [];
          this.total = 0;
          this.snackbar.error('No se pudo cargar la bitácora de pagos.');
        },
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.activeQuickFilter = 'ALL';
    this.loadPayments();
  }

  clearFilters(): void {
    this.activeQuickFilter = 'ALL';
    this.page = 1;

    this.filtersForm.reset({
      search: '',
      dateFrom: null,
      dateTo: null,
      paymentForm: null,
      isCancelled: null,
    });

    this.loadPayments();
  }

  applyQuickFilter(filter: PaymentQuickFilter): void {
    this.activeQuickFilter = filter;
    this.page = 1;

    const today = new Date();
    const todayValue = this.toInputDate(today);

    let dateFrom: string | null = null;
    let dateTo: string | null = null;
    let isCancelled: boolean | null = null;

    if (filter === 'ACTIVE') {
      isCancelled = false;
    }

    if (filter === 'CANCELLED') {
      isCancelled = true;
    }

    if (filter === 'TODAY') {
      dateFrom = todayValue;
      dateTo = todayValue;
    }

    if (filter === 'WEEK') {
      const from = new Date(today);
      from.setDate(today.getDate() - 7);

      dateFrom = this.toInputDate(from);
      dateTo = todayValue;
    }

    if (filter === 'MONTH') {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);

      dateFrom = this.toInputDate(from);
      dateTo = todayValue;
    }

    if (filter === 'ALL') {
      this.filtersForm.patchValue({
        dateFrom: null,
        dateTo: null,
        isCancelled: null,
      });
    } else {
      this.filtersForm.patchValue({
        dateFrom,
        dateTo,
        isCancelled,
      });
    }

    this.loadPayments();
  }

  previousPage(): void {
    if (this.page <= 1 || this.loading) return;

    this.page--;
    this.loadPayments();
  }

  nextPage(): void {
    if (!this.hasNextPage || this.loading) return;

    this.page++;
    this.loadPayments();
  }

  openDetail(payment: PurchasePaymentListItem): void {
    this.dialog.open(PurchasePaymentDetailDialogComponent, {
      data: {
        paymentId: payment.paymentId,
      },
      width: '980px',
      maxWidth: '94vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'payment-detail-dialog-panel',
    });
  }

  getPaymentLabel(paymentForm: string | null | undefined): string {
    const value = String(paymentForm || '').toUpperCase();

    if (value === 'EFECTIVO') return 'Efectivo';
    if (value === 'SPEI') return 'SPEI';
    if (value === 'DEBITO') return 'Débito';
    if (value === 'ESPECIE') return 'Especie';
    if (value === 'CXC') return 'CxC';

    return paymentForm || 'Sin pago';
  }

  getPaymentIcon(paymentForm: string | null | undefined): string {
    const value = String(paymentForm || '').toUpperCase();

    if (value === 'EFECTIVO') return 'payments';
    if (value === 'SPEI') return 'account_balance';
    if (value === 'DEBITO') return 'credit_card';
    if (value === 'ESPECIE') return 'inventory_2';
    if (value === 'CXC') return 'receipt_long';

    return 'account_balance_wallet';
  }

  private toInputDate(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
  }


  openPaymentComplements(payment: PurchasePaymentListItem): void {
    const ref = this.dialog.open(PaymentComplementsDialogComponent, {
      data: {
        paymentId: payment.paymentId,
        supplierName: payment.supplierName,
        paymentDate: payment.paymentDate,
        paymentForm: payment.paymentForm,
        reference: payment.reference,
        totalAmount: payment.totalAmount,
        isCancelled: payment.isCancelled,
      },
      width: '900px',
      maxWidth: '94vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'payment-complements-dialog-panel',
    });

    ref.afterClosed().subscribe((result) => {
      if (result?.changed) {
        this.loadPayments();
      }
    });
  }


}