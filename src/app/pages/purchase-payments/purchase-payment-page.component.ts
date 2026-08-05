import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  CreatePurchasePaymentRequest,
  PendingPurchase,
  PendingPurchasesBySupplier,
  PurchasePaymentsService,
} from '../../core/service/purchase-payments.service';

import { SuppliersService } from '../../core/service/suppliers.service';
import { SnackbarService } from '../../core/service/snackbar.service';

interface SupplierOption {
  id: number;
  name: string;
}

interface LocalUploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  category: 'INVOICE' | 'FISCAL_DOCUMENT';
}

interface PaymentHistoryItem {
  id?: number;
  paymentId?: number;
  paymentDate?: string;
  paymentForm?: string;
  bank?: string | null;
  reference?: string | null;
  amount?: number;
  totalAmount?: number;
  createdByUserName?: string | null;
  createdAt?: string;
}

type PaymentTab = 'document' | 'detail' | 'fiscal';

@Component({
  selector: 'app-purchase-payment-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  
  ],
  templateUrl: './purchase-payment-page.component.html',
  styleUrl: './purchase-payment-page.component.scss',
})
export class PurchasePaymentPageComponent implements OnInit {

  constructor(
      private snackbar: SnackbarService,
    ) {}
  private fb = inject(FormBuilder);
  private suppliersService = inject(SuppliersService);
  private purchasePaymentsService = inject(PurchasePaymentsService);
  private currencyEditValues = new Map<number, string>();

  loadingSuppliers = false;
  loadingPending = false;
  loadingHistory = false;
  saving = false;

  activeTab: PaymentTab = 'document';

  suppliers: SupplierOption[] = [];
  supplierSearch = new FormControl('', { nonNullable: true });

  selectedSupplierDebt: PendingPurchasesBySupplier | null = null;
  pendingPurchases: PendingPurchase[] = [];
  paymentHistory: PaymentHistoryItem[] = [];

  uploadFiles: LocalUploadFile[] = [];

  showPurchasesModal = false;
  purchaseSearch = new FormControl('', { nonNullable: true });
  modalSelectedPurchaseIds = new Set<number>();

  form = this.fb.group({
    supplierId: [null as number | null, Validators.required],

    paymentDate: [this.getTodayInputValue(), Validators.required],
    paymentForm: ['SPEI', Validators.required],
    currency: ['MXN', Validators.required],

    bank: [null as string | null],
    reference: [''],
    observations: [''],

    paymentRows: this.fb.array<FormGroup>([]),
  });

  paymentOptions = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'SPEI', label: 'SPEI / Transferencia' },
    { value: 'DEBITO', label: 'Débito' },
    { value: 'ESPECIE', label: 'Especie' },
    { value: 'CXC', label: 'CxC' },
  ];

  bankOptions = [
    { value: 'BBVA', label: 'BBVA' },
    { value: 'BANORTE', label: 'Banorte' },
    { value: 'INBURSA', label: 'Inbursa' },
    { value: 'SANTANDER', label: 'Santander' },
    { value: 'HSBC', label: 'HSBC' },
    { value: 'OTRO', label: 'Otro' },
  ];

  ngOnInit(): void {
    this.loadSuppliers();

    this.form.get('paymentForm')?.valueChanges.subscribe((value) => {
      this.applyPaymentFormRules(value || '');
    });

    this.applyPaymentFormRules(this.form.get('paymentForm')?.value || '');
  }

  get paymentRowsArray(): FormArray<FormGroup> {
    return this.form.get('paymentRows') as FormArray<FormGroup>;
  }

  get selectedSupplierId(): number | null {
    return this.form.get('supplierId')?.value || null;
  }

  get filteredSuppliers(): SupplierOption[] {
    const term = this.normalizeText(this.supplierSearch.value);

    if (!term) return this.suppliers;

    return this.suppliers.filter((supplier) =>
      this.normalizeText(supplier.name).includes(term),
    );
  }

  get requiresBank(): boolean {
    const value = this.normalizeText(this.form.get('paymentForm')?.value);
    return value === 'SPEI' || value === 'DEBITO';
  }

  get addedPurchaseIds(): number[] {
    return this.paymentRowsArray.controls.map((row) =>
      Number(row.get('purchaseId')?.value),
    );
  }

  get selectedPurchasesCount(): number {
    return this.paymentRowsArray.length;
  }

  get previousBalance(): number {
    return this.paymentRowsArray.controls.reduce((acc, row) => {
      return acc + Number(row.get('previousBalance')?.value || 0);
    }, 0);
  }

  get amountToPay(): number {
    return this.paymentRowsArray.controls.reduce((acc, row) => {
      return acc + Number(row.get('amount')?.value || 0);
    }, 0);
  }

  get remainingBalance(): number {
    return this.paymentRowsArray.controls.reduce((acc, row) => {
      return acc + Number(row.get('remainingBalance')?.value || 0);
    }, 0);
  }

  get isFullPayment(): boolean {
    return (
      this.paymentRowsArray.length > 0 &&
      this.amountToPay > 0 &&
      this.remainingBalance <= 0
    );
  }

  get availablePendingPurchases(): PendingPurchase[] {
    const addedIds = new Set(this.addedPurchaseIds);

    return this.pendingPurchases.filter(
      (purchase) => !addedIds.has(purchase.purchaseId),
    );
  }

  get filteredModalPurchases(): PendingPurchase[] {
    const term = this.normalizeText(this.purchaseSearch.value);

    if (!term) return this.availablePendingPurchases;

    return this.availablePendingPurchases.filter((purchase) => {
      const searchable = [
        purchase.folio,
        purchase.supplierName,
        purchase.sucursalName,
        purchase.vehicleName,
        purchase.vehiclePlate,
        purchase.conditions,
        purchase.paymentStatus,
      ].join(' ');

      return this.normalizeText(searchable).includes(term);
    });
  }

  get modalSelectedCount(): number {
    return this.modalSelectedPurchaseIds.size;
  }

  get modalSelectedTotal(): number {
    return this.pendingPurchases
      .filter((purchase) =>
        this.modalSelectedPurchaseIds.has(purchase.purchaseId),
      )
      .reduce((acc, purchase) => acc + Number(purchase.balance || 0), 0);
  }

  get fiscalFiles(): LocalUploadFile[] {
    return this.uploadFiles.filter(
      (file) => file.category === 'FISCAL_DOCUMENT',
    );
  }

  get invoiceFiles(): LocalUploadFile[] {
    return this.uploadFiles.filter((file) => file.category === 'INVOICE');
  }

  get canOpenPurchasesModal(): boolean {
    return (
      !!this.selectedSupplierId &&
      !this.loadingPending &&
      this.availablePendingPurchases.length > 0
    );
  }

  get canSubmit(): boolean {
    return (
      this.form.valid &&
      this.paymentRowsArray.length > 0 &&
      this.amountToPay > 0 &&
      !this.hasInvalidRows() &&
      !this.saving &&
      !this.loadingPending
    );
  }

  loadSuppliers(): void {
    this.loadingSuppliers = true;

    this.suppliersService
      .getSuppliers()
      .pipe(finalize(() => (this.loadingSuppliers = false)))
      .subscribe({
        next: (res: any) => {
          const data = Array.isArray(res)
            ? res
            : res.items || res.data || res.result || [];

          this.suppliers = data
            .map((supplier: any) => ({
              id:
                supplier.id ||
                supplier.supplierId ||
                supplier.catalogSupplierId ||
                supplier.Id,
              name:
                supplier.name ||
                supplier.businessName ||
                supplier.razonSocial ||
                supplier.description ||
                supplier.tradeName ||
                supplier.commercialName ||
                supplier.nombre ||
                supplier.Name ||
                'Proveedor sin nombre',
            }))
            .filter((supplier: SupplierOption) => !!supplier.id)
            .sort((a: SupplierOption, b: SupplierOption) =>
              a.name.localeCompare(b.name, 'es'),
            );
        },
        error: () => {
          this.suppliers = [];
          this.snackbar.error('No se pudieron cargar los proveedores.');
        },
      });
  }

  onSupplierSelectOpened(opened: boolean): void {
    if (opened) {
      this.supplierSearch.setValue('', { emitEvent: false });
    }
  }

  onSupplierChange(): void {
    const supplierId = this.selectedSupplierId;

    this.selectedSupplierDebt = null;
    this.pendingPurchases = [];
    this.paymentHistory = [];
    this.uploadFiles = [];
    this.paymentRowsArray.clear();
    this.closePurchasesModal(false);

    this.form.patchValue(
      {
        reference: '',
        observations: '',
      },
      { emitEvent: false },
    );

    this.activeTab = 'document';

    if (!supplierId) return;

    this.loadPendingPurchases(supplierId);
  }

  loadPendingPurchases(supplierId: number): void {
    this.loadingPending = true;

    this.purchasePaymentsService
      .getPendingBySupplier(supplierId)
      .pipe(finalize(() => (this.loadingPending = false)))
      .subscribe({
        next: (res) => {
          this.selectedSupplierDebt = res;
          this.pendingPurchases = res.items || [];
        },
        error: () => {
          this.selectedSupplierDebt = null;
          this.pendingPurchases = [];
          this.paymentHistory = [];
          this.paymentRowsArray.clear();

          this.snackbar.error('No se pudieron consultar las compras pendientes.');
        },
      });
  }

  openPurchasesModal(): void {
    if (!this.selectedSupplierId) {
      this.snackbar.warning('Primero selecciona un proveedor.');
      return;
    }

    if (this.availablePendingPurchases.length === 0) {
      this.snackbar.warning('No hay más compras pendientes para agregar.');
      return;
    }

    this.purchaseSearch.setValue('', { emitEvent: false });
    this.modalSelectedPurchaseIds.clear();
    this.showPurchasesModal = true;
  }

  closePurchasesModal(clearSelection = true): void {
    this.showPurchasesModal = false;

    if (clearSelection) {
      this.purchaseSearch.setValue('', { emitEvent: false });
      this.modalSelectedPurchaseIds.clear();
    }
  }

  toggleModalPurchase(purchaseId: number, checked: boolean): void {
    if (checked) {
      this.modalSelectedPurchaseIds.add(purchaseId);
      return;
    }

    this.modalSelectedPurchaseIds.delete(purchaseId);
  }

  isModalPurchaseSelected(purchaseId: number): boolean {
    return this.modalSelectedPurchaseIds.has(purchaseId);
  }

  addSelectedPurchases(): void {
    if (this.modalSelectedPurchaseIds.size === 0) {
      this.snackbar.warning('Selecciona al menos una compra pendiente.');
      return;
    }

    const addedIds = new Set(this.addedPurchaseIds);

    const purchasesToAdd = this.pendingPurchases.filter(
      (purchase) =>
        this.modalSelectedPurchaseIds.has(purchase.purchaseId) &&
        !addedIds.has(purchase.purchaseId),
    );

    purchasesToAdd.forEach((purchase) => {
      this.paymentRowsArray.push(this.createPaymentRow(purchase));
    });

    this.closePurchasesModal();
    this.recalculatePaymentRows();
  }

  removePaymentRow(index: number): void {
    this.paymentRowsArray.removeAt(index);
    this.currencyEditValues.delete(index);
    this.recalculatePaymentRows();
  }

  clearPaymentRow(index: number): void {
    const row = this.paymentRowsArray.at(index);

    if (!row) return;

    row.patchValue({ amount: 0 });
    this.recalculatePaymentRows();
  }

  liquidatePaymentRow(index: number): void {
    const row = this.paymentRowsArray.at(index);

    if (!row) return;

    const previousBalance = Number(row.get('previousBalance')?.value || 0);

    row.patchValue({ amount: previousBalance });
    this.recalculatePaymentRows();
  }

  private createPaymentRow(purchase: PendingPurchase): FormGroup {
    const row = this.fb.group({
      purchaseId: [purchase.purchaseId, Validators.required],
      documentReference: [
        purchase.folio,
        [Validators.required, Validators.maxLength(120)],
      ],
      folio: [purchase.folio],
      supplierName: [purchase.supplierName],
      purchaseDate: [purchase.purchaseDate],
      dueDate: [purchase.dueDate],
      partialityNumber: [
        purchase.nextPartialityNumber || 1,
        Validators.required,
      ],
      currency: ['MXN', Validators.required],
      previousBalance: [purchase.balance, Validators.required],
      amount: [
        purchase.balance,
        [
          Validators.required,
          Validators.min(0.01),
          Validators.max(purchase.balance),
        ],
      ],
      remainingBalance: [
        Math.max(
          Number(purchase.balance || 0) - Number(purchase.balance || 0),
          0,
        ),
      ],
    });

    row.get('amount')?.valueChanges.subscribe(() => {
      this.recalculatePaymentRows();
    });

    return row;
  }

  private recalculatePaymentRows(): void {
    this.paymentRowsArray.controls.forEach((row) => {
      const previousBalance = Number(row.get('previousBalance')?.value || 0);
      const amount = Number(row.get('amount')?.value || 0);
      const remaining = Math.max(previousBalance - amount, 0);

      row.patchValue(
        {
          remainingBalance: remaining,
        },
        { emitEvent: false },
      );

      const amountCtrl = row.get('amount');

      if (amountCtrl) {
        amountCtrl.setValidators([
          Validators.required,
          Validators.min(0.01),
          Validators.max(previousBalance),
        ]);

        amountCtrl.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  setActiveTab(tab: PaymentTab): void {
    this.activeTab = tab;
  }

  isTabActive(tab: PaymentTab): boolean {
    return this.activeTab === tab;
  }

  onFilesSelected(event: Event, category: 'INVOICE' | 'FISCAL_DOCUMENT'): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);

    files.forEach((file) => {
      this.uploadFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        category,
      });
    });

    input.value = '';
  }

  removeUploadFile(fileId: string): void {
    this.uploadFiles = this.uploadFiles.filter((file) => file.id !== fileId);
  }

  submit(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      this.paymentRowsArray.controls.forEach((row) => row.markAllAsTouched());
      return;
    }

    const raw = this.form.getRawValue();
    const supplierId = Number(raw.supplierId);

    const items = this.paymentRowsArray.controls.map((row) => ({
      purchaseId: Number(row.get('purchaseId')?.value),
      amountApplied: Number(row.get('amount')?.value || 0),
    }));

    const invalidRow = this.paymentRowsArray.controls.find((row) => {
      const previousBalance = Number(row.get('previousBalance')?.value || 0);
      const amount = Number(row.get('amount')?.value || 0);

      return amount <= 0 || amount > previousBalance;
    });

    if (invalidRow) {
      this.snackbar.error(
        'Revisa los importes: no pueden ser cero ni mayores al saldo anterior.',
      );
      return;
    }

    const request: CreatePurchasePaymentRequest = {
      supplierId,
      paymentDate: String(raw.paymentDate),
      paymentForm: String(raw.paymentForm || '')
        .trim()
        .toUpperCase(),
      bank: raw.bank ? String(raw.bank).trim().toUpperCase() : null,
      reference: raw.reference ? String(raw.reference).trim() : null,
      observations: raw.observations ? String(raw.observations).trim() : null,
      items,
    };

    this.saving = true;

    this.purchasePaymentsService.createPayment(request).subscribe({
      next: (res) => {
        const paymentId = Number(res.paymentId || 0);

        if (!paymentId) {
          this.saving = false;

          this.snackbar.warning(
            'El pago se guardó, pero no se recibió el ID para subir documentos.',
          );

          this.prepareNextDocument();

          if (supplierId) {
            this.loadPendingPurchases(supplierId);
          }

          return;
        }

        if (this.uploadFiles.length > 0) {
          this.uploadPaymentFilesAfterSave(
            paymentId,
            supplierId,
            res.totalAmount,
          );
          return;
        }

        this.finishSuccessfulSave(
          supplierId,
          `Pago registrado. Total: ${this.formatMoney(res.totalAmount)}.`,
        );
      },
      error: (err) => {
        this.saving = false;

        const message =
          typeof err?.error === 'string'
            ? err.error
            : 'No se pudo guardar el pago.';

        this.snackbar.error(message);
      },
    });
  }

  prepareNextDocument(): void {
    this.uploadFiles = [];
    this.paymentRowsArray.clear();
    this.currencyEditValues.clear();
    this.paymentHistory = [];
    this.activeTab = 'document';

    this.form.patchValue(
      {
        reference: '',
        observations: '',
      },
      { emitEvent: false },
    );
  }

  resetAll(): void {
    this.selectedSupplierDebt = null;
    this.pendingPurchases = [];
    this.paymentHistory = [];
    this.uploadFiles = [];
    this.paymentRowsArray.clear();
    this.currencyEditValues.clear();
    this.closePurchasesModal(false);
    this.activeTab = 'document';
    this.supplierSearch.setValue('', { emitEvent: false });
    this.purchaseSearch.setValue('', { emitEvent: false });

    this.form.reset({
      supplierId: null,
      paymentDate: this.getTodayInputValue(),
      paymentForm: 'SPEI',
      currency: 'MXN',
      bank: null,
      reference: '',
      observations: '',
    });

    this.applyPaymentFormRules('SPEI');
  }

  getPurchaseVehicleDisplay(item: PendingPurchase | null): string {
    if (!item) return 'Sin vehículo';
    if (!item.vehicleName) return 'Sin vehículo';

    return item.vehiclePlate
      ? `${item.vehicleName} (${item.vehiclePlate})`
      : item.vehicleName;
  }

  getFileSizeLabel(size: number): string {
    if (size < 1024) return `${size} B`;

    const kb = size / 1024;

    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    return `${(kb / 1024).toFixed(1)} MB`;
  }

  formatCurrency(value: number | string | null | undefined): string {
    const amount = Number(value || 0);

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  getCurrencyInputDisplay(
    index: number,
    value: number | string | null | undefined,
  ): string {
    const editingValue = this.currencyEditValues.get(index);

    if (editingValue !== undefined) {
      return editingValue;
    }

    return this.formatCurrency(value);
  }

  startCurrencyEdit(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const row = this.paymentRowsArray.at(index);

    if (!row) return;

    const value = Number(row.get('amount')?.value || 0);
    const rawValue = this.toPlainAmount(value);

    this.currencyEditValues.set(index, rawValue);
    input.value = rawValue;

    setTimeout(() => input.select());
  }

  onCurrencyInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value;

    this.currencyEditValues.set(index, rawValue);

    const amount = this.parseCurrencyValue(rawValue);
    const row = this.paymentRowsArray.at(index);

    if (!row) return;

    row.get('amount')?.setValue(amount, { emitEvent: true });
  }

  finishCurrencyEdit(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const row = this.paymentRowsArray.at(index);

    if (!row) return;

    const amount = this.parseCurrencyValue(input.value);

    row.get('amount')?.setValue(amount, { emitEvent: true });

    this.currencyEditValues.delete(index);
    input.value = this.formatCurrency(amount);

    this.recalculatePaymentRows();
  }

  private parseCurrencyValue(
    value: string | number | null | undefined,
  ): number {
    const cleanValue = String(value || '')
      .replace(/MXN/gi, '')
      .replace(/\$/g, '')
      .replace(/,/g, '')
      .replace(/\s/g, '')
      .replace(/[^\d.-]/g, '');

    const amount = Number(cleanValue);

    return Number.isFinite(amount) ? amount : 0;
  }

  private toPlainAmount(value: number): string {
    if (!Number.isFinite(value)) return '0';

    return value.toFixed(2).replace(/\.00$/, '');
  }

  private hasInvalidRows(): boolean {
    return this.paymentRowsArray.controls.some((row) => row.invalid);
  }

  private applyPaymentFormRules(paymentForm: string): void {
    const bankCtrl = this.form.get('bank');
    const referenceCtrl = this.form.get('reference');

    if (!bankCtrl || !referenceCtrl) return;

    const value = this.normalizeText(paymentForm);

    if (value === 'SPEI' || value === 'DEBITO') {
      bankCtrl.setValidators([Validators.required]);
      referenceCtrl.setValidators([Validators.required]);
    } else {
      bankCtrl.clearValidators();

      if (value === 'EFECTIVO') {
        bankCtrl.setValue(null, { emitEvent: false });
      }

      referenceCtrl.clearValidators();
    }

    bankCtrl.updateValueAndValidity({ emitEvent: false });
    referenceCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private getTodayInputValue(): string {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');

    return `${now.getFullYear()}-${month}-${day}`;
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(value || 0));
  }

  private normalizeText(value: string | null | undefined): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  private uploadPaymentFilesAfterSave(
    paymentId: number,
    supplierId: number,
    totalAmount: number,
  ): void {
    const filesToUpload = this.uploadFiles.map((item) => ({
      file: item.file,
      category: item.category,
    }));

    this.purchasePaymentsService
      .uploadPaymentFiles(paymentId, filesToUpload)
      .subscribe({
        next: () => {
          this.finishSuccessfulSave(
            supplierId,
            `Pago registrado con documentos. Total: ${this.formatMoney(totalAmount)}.`,
          );
        },
        error: (err) => {
          this.saving = false;

          const message =
            typeof err?.error === 'string'
              ? err.error
              : 'El pago se guardó, pero no se pudieron subir los documentos.';

          this.snackbar.warning(message);

          this.prepareNextDocument();

          if (supplierId) {
            this.loadPendingPurchases(supplierId);
          }
        },
      });
  }

  private finishSuccessfulSave(supplierId: number, message: string): void {
    this.saving = false;

    this.snackbar.success(message);

    this.prepareNextDocument();

    if (supplierId) {
      this.loadPendingPurchases(supplierId);
    }
  }
}