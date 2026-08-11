import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { SnackbarService } from '../../../core/service/snackbar.service';

import { ProductMultiSelectDialogComponent } from '../../../modals/product-multi-selector/product-multi-select-dialog.component';

import { SupplierSearchDialogComponent } from '../../../modals/suppliers-purchase/supplier-search-dialog.component';

import {
  PurchasePaymentDialogComponent,
  PurchasePaymentDialogResult,
} from '../../../modals/confirmation-payment/purchase-payment-dialog.component';

import {
  PurchasesService,
  CreatePurchasePayload,
  UpdatePurchasePayload,
  PurchaseDetail,
  PurchaseDetailItem,
  PurchaseSucursalOption,
  PurchaseVehicleOption,
  PurchaseCopyTemplate,
} from '../../../core/service/purchases.service';

interface SupplierSelected {
  id: number;
  name: string;
  rfc?: string | null;
}

interface ProductSelectedResult {
  productId: number;
  code?: string;
  description: string;
  unit: string;

  // Soporta cantidades decimales.
  quantity: number;

  unitPrice: number;
  ivaRate?: number;
}

interface PurchasePaymentInfo {
  paymentForm: string | null;
  bank: string | null;
  paymentReference: string | null;
}

type PurchaseDatePreset = 'TODAY' | 'YESTERDAY' | 'TOMORROW' | 'CUSTOM';

@Component({
  selector: 'app-purchase-form',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],

  templateUrl: './purchase-form.component.html',

  styleUrl: './purchase-form.component.scss',
})
export class PurchaseFormComponent implements OnInit {
  private fb = inject(FormBuilder);

  form!: FormGroup;

  isEditMode = false;

  purchaseId: number | null = null;

  loadingDetail = false;

  loadingCatalogs = false;

  folioReadonly = '';

  copySourceFolio = '';

  purchaseDateText = '';

  purchaseDateHint = '';

  paymentDayTitle = '';

  paymentDayHint = '';

  purchaseDatePreset: PurchaseDatePreset = 'TODAY';

  selectedSupplier: SupplierSelected | null = null;

  sucursales: PurchaseSucursalOption[] = [];

  vehicles: PurchaseVehicleOption[] = [];

  subtotal = 0;

  iva = 0;

  total = 0;

  editingRowIndex: number | null = null;

  saving = false;

  paymentDialogOpen = false;

  private originalConditions: string | null = null;

  private currentPaymentForm: string | null = null;

  private currentBank: string | null = null;

  private currentPaymentReference: string | null = null;

  constructor(
    private dialog: MatDialog,

    private snackbar: SnackbarService,

    private purchasesService: PurchasesService,

    private router: Router,

    private route: ActivatedRoute,
  ) {}

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
    this.buildForm();

    this.bindGeneralRules();

    this.loadCatalogs();

    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      const parsedId = Number(idParam);

      if (!Number.isFinite(parsedId) || parsedId <= 0) {
        this.snackbar.error('El Id de la compra no es válido.');

        this.router.navigate(['/compras/mine']);

        return;
      }

      this.isEditMode = true;

      this.purchaseId = parsedId;

      this.loadPurchaseForEdit(parsedId);

      return;
    }

    this.isEditMode = false;

    this.purchaseId = null;

    const copyTemplate = history.state?.copyTemplate as
      | PurchaseCopyTemplate
      | undefined;

    if (copyTemplate) {
      this.applyCopyTemplate(copyTemplate);

      return;
    }

    this.applyPaymentRulesFromForm();
  }

  // ============================================================
  // FORM
  // ============================================================

  private buildForm(): void {
    const today = this.toInputDate(this.getToday());

    this.form = this.fb.group({
      folio: [
        {
          value: 'Se genera automáticamente',

          disabled: true,
        },
      ],

      fecha: [today, Validators.required],

      vencimiento: [today, Validators.required],

      tipoComprobante: ['SIN COMPROBANTE', Validators.required],

      referencia: [''],

      condiciones: ['CONTADO', Validators.required],

      sucursalesId: [null, Validators.required],

      vehicleId: [null],

      facturable: [true],

      observaciones: [''],

      supplierId: [null, Validators.required],

      items: this.fb.array([]),
    });
  }

  private bindGeneralRules(): void {
    this.form.get('fecha')?.valueChanges.subscribe(() => {
      this.syncPurchaseDatePreset();

      this.applyPaymentRulesFromForm();
    });

    this.form.get('condiciones')?.valueChanges.subscribe(() => {
      this.applyPaymentRulesFromForm();
    });
  }

  // ============================================================
  // CATÁLOGOS
  // ============================================================

  private loadCatalogs(): void {
    this.loadingCatalogs = true;

    this.purchasesService
      .getPurchaseSucursales()
      .pipe(finalize(() => (this.loadingCatalogs = false)))
      .subscribe({
        next: (items) => {
          this.sucursales = items || [];
        },

        error: () => {
          this.snackbar.error('No se pudieron cargar las UEN/Sucursales.');
        },
      });

    this.purchasesService.getPurchaseVehicles().subscribe({
      next: (items) => {
        this.vehicles = items || [];
      },

      error: () => {
        this.snackbar.error('No se pudieron cargar los vehículos.');
      },
    });
  }

  // ============================================================
  // LOAD EDIT
  // ============================================================

  private loadPurchaseForEdit(id: number): void {
    this.loadingDetail = true;

    this.purchasesService
      .getPurchaseDetail(id)
      .pipe(finalize(() => (this.loadingDetail = false)))
      .subscribe({
        next: (detail) => this.patchFormForEdit(detail),

        error: (err) => {
          this.snackbar.error(
            this.getErrorMessage(
              err,
              'No se pudo cargar la compra para edición.',
            ),
          );

          this.router.navigate(['/compras/mine']);
        },
      });
  }

  private patchFormForEdit(detail: PurchaseDetail): void {
    this.folioReadonly = detail.folio;

    this.originalConditions = detail.conditions;

    this.currentPaymentForm = detail.paymentForm || null;

    this.currentBank = detail.bank || null;

    this.currentPaymentReference = detail.paymentReference || null;

    this.selectedSupplier = {
      id: detail.supplierId,

      name: detail.supplierName,

      rfc: detail.supplierRfc,
    };

    this.form.patchValue(
      {
        folio: detail.folio,

        fecha: this.toInputDateFromApi(detail.purchaseDate),

        vencimiento: this.toInputDateFromApi(detail.dueDate),

        tipoComprobante: detail.voucherType || 'SIN COMPROBANTE',

        referencia: detail.reference || '',

        condiciones: detail.conditions || 'CONTADO',

        sucursalesId: detail.sucursalesId ?? null,

        vehicleId: detail.vehicleId ?? null,

        observaciones: detail.observations || '',

        supplierId: detail.supplierId,
      },
      {
        emitEvent: false,
      },
    );

    this.clearItems();

    detail.items.forEach((item) => {
      this.items.push(this.createItemGroupFromDetail(item));
    });

    this.calculateTotals();

    this.syncPurchaseDatePreset();

    this.refreshDatePresentation();
  }

  // ============================================================
  // GETTERS
  // ============================================================

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get isCredit(): boolean {
    return this.form?.get('condiciones')?.value === 'CREDITO';
  }

  get selectedSucursalName(): string {
    const id = this.toNullableNumber(this.form?.get('sucursalesId')?.value);

    if (!id) {
      return 'Sin asignar';
    }

    return (
      this.sucursales.find((x) => x.id === id)?.description || 'Sin asignar'
    );
  }

  get selectedVehicleName(): string {
    const id = this.toNullableNumber(this.form?.get('vehicleId')?.value);

    if (!id) {
      return 'Sin vehículo';
    }

    return (
      this.vehicles.find((x) => x.id === id)?.displayName || 'Sin vehículo'
    );
  }

  get saveButtonIcon(): string {
    if (this.saving) {
      return 'hourglass_top';
    }

    if (this.paymentDialogOpen) {
      return 'payments';
    }

    return this.isEditMode ? 'published_with_changes' : 'save';
  }

  get saveButtonText(): string {
    if (this.saving) {
      return this.isEditMode ? 'Actualizando compra...' : 'Guardando compra...';
    }

    if (this.paymentDialogOpen) {
      return 'Confirmando pago...';
    }

    return this.isEditMode ? 'Actualizar compra' : 'Guardar compra';
  }

  get totalBadgeText(): string {
    if (this.loadingDetail) {
      return 'Cargando';
    }

    if (this.isEditMode) {
      return 'En edición';
    }

    if (this.copySourceFolio) {
      return 'Copia';
    }

    return this.items.length > 0 ? 'En captura' : 'Vacío';
  }

  // ============================================================
  // SUPPLIER
  // ============================================================

  openSupplierSearch(): void {
    const dialogRef = this.dialog.open(SupplierSearchDialogComponent, {
      panelClass: 'custom-dialog-panel',

      autoFocus: false,

      restoreFocus: false,
    });

    dialogRef.afterClosed().subscribe((supplier: any) => {
      if (!supplier) {
        return;
      }

      this.setSupplier({
        id: supplier.id,

        name: supplier.name,

        rfc: supplier.rfc,
      });
    });
  }

  setSupplier(
    supplier: SupplierSelected,

    showMessage = true,
  ): void {
    this.selectedSupplier = supplier;

    this.form.patchValue({
      supplierId: supplier.id,
    });

    if (showMessage) {
      this.snackbar.success('Proveedor seleccionado');
    }
  }

  // ============================================================
  // PRODUCTS
  // ============================================================

  openProductsModal(): void {
    const selectedIds = this.items.controls
      .map((ctrl) => Number(ctrl.get('productId')?.value || 0))
      .filter((id) => id > 0);

    const dialogRef = this.dialog.open(ProductMultiSelectDialogComponent, {
      panelClass: 'custom-dialog-panel',

      autoFocus: false,

      restoreFocus: false,

      data: {
        selectedIds,
      },
    });

    dialogRef
      .afterClosed()
      .subscribe((products: ProductSelectedResult[] | null) => {
        if (!products || products.length === 0) {
          return;
        }

        this.addSelectedProducts(products);
      });
  }

  addEmptyProduct(): void {
    this.openProductsModal();
  }

  addSelectedProducts(products: ProductSelectedResult[]): void {
    products.forEach((product) => {
      this.items.push(this.createItemGroup(product));
    });

    this.calculateTotals();

    this.snackbar.success(`${products.length} partida(s) agregada(s)`);
  }

  // ============================================================
  // ITEM
  // ============================================================

  private createItemGroup(product: ProductSelectedResult): FormGroup {
    const quantity = this.normalizeQuantity(product.quantity);

    const unitPrice = Number(product.unitPrice || 0);

    const lineSubtotal = quantity * unitPrice;

    const lineTotal = lineSubtotal;

    return this.fb.group({
      productId: [product.productId, Validators.required],

      code: [product.code || ''],

      description: [product.description || '', Validators.required],

      unit: [product.unit || 'PZ', Validators.required],

      // ========================================================
      // CANTIDAD DECIMAL
      // ========================================================
      quantity: [quantity, [Validators.required, Validators.min(0.001)]],

      unitPrice: [
        unitPrice,
        [
          Validators.required,
          this.unitPriceValidator(product.code, product.description),
        ],
      ],

      ivaRate: [0],

      lineSubtotal: [this.round(lineSubtotal)],

      lineIva: [0],

      lineTotal: [this.round(lineTotal)],
    });
  }

  private createItemGroupFromDetail(item: PurchaseDetailItem): FormGroup {
    return this.createItemGroup({
      productId: item.productId,

      code: '',

      description: item.productDescription,

      unit: item.unit || 'PZ',

      quantity: this.normalizeQuantity(item.quantity),

      unitPrice: Number(item.unitPrice || 0),

      ivaRate: 0,
    });
  }

  private clearItems(): void {
    while (this.items.length > 0) {
      this.items.removeAt(0);
    }
  }

  // ============================================================
  // EDIT ITEM
  // ============================================================

  isEditingRow(index: number): boolean {
    return this.editingRowIndex === index;
  }

  toggleEditRow(index: number): void {
    if (this.editingRowIndex === index) {
      this.recalculateLine(index);

      this.editingRowIndex = null;

      return;
    }

    this.editingRowIndex = index;
  }

  removeProduct(index: number): void {
    if (index < 0 || index >= this.items.length) {
      return;
    }

    this.items.removeAt(index);

    if (this.editingRowIndex === index) {
      this.editingRowIndex = null;
    }

    if (this.editingRowIndex !== null && this.editingRowIndex > index) {
      this.editingRowIndex--;
    }

    this.calculateTotals();
  }

  // ============================================================
  // RECALCULATE
  // ============================================================

  recalculateLine(index: number): void {
    const item = this.items.at(index) as FormGroup;

    if (!item) {
      return;
    }

    const quantity = this.normalizeQuantity(item.get('quantity')?.value ?? 0);

    const unitPrice = Number(item.get('unitPrice')?.value ?? 0);

    const lineSubtotal = quantity * unitPrice;

    const lineTotal = lineSubtotal;

    item.patchValue(
      {
        quantity,

        lineSubtotal: this.round(lineSubtotal),

        lineIva: 0,

        lineTotal: this.round(lineTotal),

        ivaRate: 0,
      },

      {
        emitEvent: false,
      },
    );

    this.calculateTotals();
  }

  // ============================================================
  // TOTALS
  // ============================================================

  calculateTotals(): void {
    let subtotal = 0;

    let total = 0;

    this.items.controls.forEach((ctrl) => {
      const quantity = this.normalizeQuantity(ctrl.get('quantity')?.value ?? 0);

      const unitPrice = Number(ctrl.get('unitPrice')?.value ?? 0);

      const lineSubtotal = quantity * unitPrice;

      const lineTotal = lineSubtotal;

      subtotal += lineSubtotal;

      total += lineTotal;

      ctrl.patchValue(
        {
          lineSubtotal: this.round(lineSubtotal),

          lineIva: 0,

          lineTotal: this.round(lineTotal),

          ivaRate: 0,
        },

        {
          emitEvent: false,
        },
      );
    });

    this.subtotal = this.round(subtotal);

    this.iva = 0;

    this.total = this.round(total);
  }

  // ============================================================
  // DATES
  // ============================================================

  openPurchaseDatePicker(input: HTMLInputElement): void {
    if (!input) {
      return;
    }

    const picker = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    if (typeof picker.showPicker === 'function') {
      picker.showPicker();

      return;
    }

    input.click();
  }

  setPurchaseDatePreset(
    offsetDays: number,

    preset: PurchaseDatePreset,
  ): void {
    const date = this.getToday();

    date.setDate(date.getDate() + offsetDays);

    this.purchaseDatePreset = preset;

    this.form.patchValue({
      fecha: this.toInputDate(date),
    });
  }

  onManualPurchaseDateChange(value: string): void {
    if (!value) {
      return;
    }

    this.form.patchValue({
      fecha: value,
    });

    this.purchaseDatePreset = 'CUSTOM';
  }

  private applyPaymentRulesFromForm(): void {
    if (!this.form) {
      return;
    }

    const purchaseDateValue = this.form.get('fecha')?.value;

    const purchaseDate = this.parseInputDate(purchaseDateValue);

    if (!purchaseDate) {
      return;
    }

    const dueDate = this.isCredit
      ? this.getNextMonday(purchaseDate)
      : purchaseDate;

    this.form.patchValue(
      {
        vencimiento: this.toInputDate(dueDate),
      },

      {
        emitEvent: false,
      },
    );

    this.refreshDatePresentation();
  }

  private refreshDatePresentation(): void {
    const purchaseDate = this.parseInputDate(this.form.get('fecha')?.value);

    const dueDate = this.parseInputDate(this.form.get('vencimiento')?.value);

    if (!purchaseDate || !dueDate) {
      this.purchaseDateText = '';

      this.purchaseDateHint = '';

      this.paymentDayTitle = '';

      this.paymentDayHint = '';

      return;
    }

    this.purchaseDateText = this.formatLongDate(purchaseDate);

    this.purchaseDateHint = this.getPurchaseDateHint(purchaseDate);

    this.paymentDayTitle = this.formatLongDate(dueDate);

    this.paymentDayHint = this.isCredit
      ? 'Compra a crédito: el corte se manda al próximo lunes. Si la compra es lunes, queda ese mismo día.'
      : 'Compra de contado: el pago queda registrado para el mismo día de la compra.';
  }

  private getPurchaseDateHint(date: Date): string {
    const today = this.getToday();

    if (this.isSameDate(date, today)) {
      return 'La compra se registrará con fecha de hoy.';
    }

    const yesterday = this.getToday();

    yesterday.setDate(yesterday.getDate() - 1);

    if (this.isSameDate(date, yesterday)) {
      return 'La compra se registrará con fecha de ayer.';
    }

    const tomorrow = this.getToday();

    tomorrow.setDate(tomorrow.getDate() + 1);

    if (this.isSameDate(date, tomorrow)) {
      return 'La compra se registrará con fecha de mañana.';
    }

    return 'La compra se registrará con la fecha seleccionada.';
  }

  private syncPurchaseDatePreset(): void {
    const selectedDate = this.parseInputDate(this.form.get('fecha')?.value);

    if (!selectedDate) {
      this.purchaseDatePreset = 'CUSTOM';

      return;
    }

    const today = this.getToday();

    const yesterday = this.getToday();

    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = this.getToday();

    tomorrow.setDate(tomorrow.getDate() + 1);

    if (this.isSameDate(selectedDate, today)) {
      this.purchaseDatePreset = 'TODAY';

      return;
    }

    if (this.isSameDate(selectedDate, yesterday)) {
      this.purchaseDatePreset = 'YESTERDAY';

      return;
    }

    if (this.isSameDate(selectedDate, tomorrow)) {
      this.purchaseDatePreset = 'TOMORROW';

      return;
    }

    this.purchaseDatePreset = 'CUSTOM';
  }

  // ============================================================
  // SAVE
  // ============================================================

  save(): void {
    if (this.saving || this.paymentDialogOpen) {
      return;
    }

    this.calculateTotals();

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      if (!this.form.get('sucursalesId')?.value) {
        this.snackbar.error('Selecciona la UEN/Sucursal.');

        return;
      }

      this.snackbar.error('Completa los datos obligatorios de la compra.');

      return;
    }

    if (!this.selectedSupplier || !this.form.get('supplierId')?.value) {
      this.snackbar.error('Selecciona un proveedor.');

      return;
    }

    if (this.items.length === 0) {
      this.snackbar.error('Agrega al menos una partida a la compra.');

      return;
    }

    const invalidItem = this.items.controls.some((ctrl) => ctrl.invalid);

    if (invalidItem) {
      this.snackbar.error(
        'Revisa las partidas: la cantidad debe ser mayor o igual a 0.001 y el costo es obligatorio.',
      );

      return;
    }

    if (this.total <= 0) {
      this.snackbar.error('El total de la compra debe ser mayor a 0.');

      return;
    }

    if (this.isCredit) {
      this.executeSave({
        paymentForm: 'CXC',

        bank: null,

        paymentReference: null,
      });

      return;
    }

    this.openPaymentConfirmation();
  }

  // ============================================================
  // PAYMENT
  // ============================================================

  private openPaymentConfirmation(): void {
    this.paymentDialogOpen = true;

    console.log('PAYMENT DATA TO MODAL:', {
      total: this.total,

      paymentForm: this.currentPaymentForm,

      bank: this.currentBank,

      paymentReference: this.currentPaymentReference,
    });

    const dialogRef = this.dialog.open(PurchasePaymentDialogComponent, {
      panelClass: ['custom-dialog-panel', 'purchase-payment-dialog-panel'],

      autoFocus: false,

      restoreFocus: false,

      disableClose: true,

      data: {
        total: this.total,

        paymentForm: this.currentPaymentForm,

        bank: this.currentBank,

        paymentReference: this.currentPaymentReference,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.paymentDialogOpen = false;

      if (!result) {
        return;
      }

      const payment = this.normalizePaymentResult(result);

      this.currentPaymentForm = payment.paymentForm;

      this.currentBank = payment.bank;

      this.currentPaymentReference = payment.paymentReference;

      this.executeSave(payment);
    });
  }

  private executeSave(payment: PurchasePaymentInfo): void {
    const payload = this.buildPayload(payment);

    this.saving = true;

    const request$ =
      this.isEditMode && this.purchaseId
        ? this.purchasesService.updatePurchase(
            this.purchaseId,
            payload as UpdatePurchasePayload,
          )
        : this.purchasesService.createPurchase(
            payload as CreatePurchasePayload,
          );

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (res) => {
        const folio = res?.folio ? ` (${res.folio})` : '';

        this.snackbar.success(
          this.isEditMode
            ? `Compra actualizada correctamente${folio}.`
            : `Compra registrada correctamente${folio}.`,
        );

        this.router.navigate(['/compras/mine']);
      },

      error: (err) => {
        this.snackbar.error(
          this.getErrorMessage(
            err,

            this.isEditMode
              ? 'Ocurrió un error al actualizar la compra.'
              : 'Ocurrió un error al registrar la compra.',
          ),
        );
      },
    });
  }

  // ============================================================
  // PAYLOAD
  // ============================================================

  private buildPayload(payment: PurchasePaymentInfo): UpdatePurchasePayload {
    const raw = this.form.getRawValue();

    return {
      purchaseDate: raw.fecha,

      dueDate: raw.vencimiento,

      conditions: raw.condiciones,

      voucherType: raw.tipoComprobante,

      reference: this.clean(raw.referencia),

      sucursalesId: this.toNullableNumber(raw.sucursalesId),

      vehicleId: this.toNullableNumber(raw.vehicleId),

      supplierId: Number(raw.supplierId),

      observations: this.clean(raw.observaciones),

      paymentForm: this.clean(payment.paymentForm),

      bank: this.clean(payment.bank),

      paymentReference: this.clean(payment.paymentReference),

      items: this.items.controls.map((ctrl) => ({
        productId: Number(ctrl.get('productId')?.value),

        quantity: this.normalizeQuantity(ctrl.get('quantity')?.value),

        unitPrice: Number(ctrl.get('unitPrice')?.value),
      })),
    };
  }

  private normalizePaymentResult(
    result: PurchasePaymentDialogResult | any,
  ): PurchasePaymentInfo {
    return {
      paymentForm: this.clean(
        result?.paymentForm ??
          result?.formaPago ??
          result?.form ??
          result?.paymentMethod,
      ),

      bank: this.clean(result?.bank ?? result?.banco),

      paymentReference: this.clean(
        result?.paymentReference ?? result?.reference ?? result?.referencia,
      ),
    };
  }

  // ============================================================
  // DATE HELPERS
  // ============================================================

  private getNextMonday(date: Date): Date {
    const result = new Date(date);

    result.setHours(0, 0, 0, 0);

    const day = result.getDay();

    const daysUntilMonday = day === 1 ? 0 : (8 - day) % 7;

    result.setDate(result.getDate() + daysUntilMonday);

    return result;
  }

  private parseInputDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const parts = String(value).split('T')[0].split('-');

    if (parts.length !== 3) {
      return null;
    }

    const year = Number(parts[0]);

    const month = Number(parts[1]);

    const day = Number(parts[2]);

    if (!year || !month || !day) {
      return null;
    }

    const date = new Date(year, month - 1, day);

    date.setHours(0, 0, 0, 0);

    return date;
  }

  private toInputDateFromApi(value: string | null | undefined): string {
    if (!value) {
      return this.toInputDate(this.getToday());
    }

    const onlyDate = String(value).split('T')[0];

    if (/^\d{4}-\d{2}-\d{2}$/.test(onlyDate)) {
      return onlyDate;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return this.toInputDate(this.getToday());
    }

    return this.toInputDate(parsed);
  }

  private getToday(): Date {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-` + `${month}-` + `${day}`;
  }

  private formatLongDate(date: Date): string {
    const text = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',

      year: 'numeric',

      month: 'long',

      day: 'numeric',
    }).format(date);

    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private isSameDate(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  // ============================================================
  // GENERAL HELPERS
  // ============================================================

  private clean(value: unknown): string | null {
    const parsed = String(value ?? '').trim();

    return parsed ? parsed : null;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  // ============================================================
  // NORMALIZAR CANTIDAD
  // Hasta 3 decimales
  // ============================================================

  private normalizeQuantity(value: unknown): number {
    const parsed = Number(value ?? 0);

    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.round((parsed + Number.EPSILON) * 1000) / 1000;
  }

  private round(value: number): number {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  private getErrorMessage(
    err: any,

    fallback: string,
  ): string {
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

  // ============================================================
  // COPY TEMPLATE
  // ============================================================

  private applyCopyTemplate(template: PurchaseCopyTemplate): void {
    if (!template) {
      return;
    }

    this.copySourceFolio = template.sourceFolio || '';

    this.folioReadonly = '';

    this.isEditMode = false;

    this.purchaseId = null;

    this.originalConditions = null;

    this.currentPaymentForm = template.paymentForm || null;

    this.currentBank = template.bank || null;

    this.currentPaymentReference = template.paymentReference || null;

    this.setSupplier(
      {
        id: template.supplierId,

        name: template.supplierName,

        rfc: null,
      },

      false,
    );

    const purchaseDate = this.toInputDate(this.getToday());

    this.form.patchValue(
      {
        folio: 'Se genera automáticamente',

        fecha: purchaseDate,

        vencimiento: purchaseDate,

        tipoComprobante: template.voucherType || 'SIN COMPROBANTE',

        referencia: template.reference || '',

        condiciones: template.conditions || 'CONTADO',

        sucursalesId: template.sucursalesId ?? null,

        vehicleId: template.vehicleId ?? null,

        observaciones: template.observations || '',

        supplierId: template.supplierId,
      },

      {
        emitEvent: false,
      },
    );

    this.clearItems();

    (template.items || []).forEach((item) => {
      this.items.push(this.createItemGroupFromCopyTemplate(item));
    });

    this.editingRowIndex = null;

    this.calculateTotals();

    this.syncPurchaseDatePreset();

    this.applyPaymentRulesFromForm();

    this.refreshDatePresentation();

    this.snackbar.success(
      `Compra copiada desde ${template.sourceFolio}. Revisa los datos antes de guardar.`,
    );
  }

  private createItemGroupFromCopyTemplate(
    item: PurchaseCopyTemplate['items'][number],
  ): FormGroup {
    return this.createItemGroup({
      productId: item.productId,

      code: '',

      description: item.productDescription,

      unit: item.unit || 'PZ',

      quantity: this.normalizeQuantity(item.quantity),

      unitPrice: Number(item.unitPrice || 0),

      ivaRate: 0,
    });
  }

  private unitPriceValidator(
    productCode?: string,
    productDescription?: string,
  ) {
    return (control: any) => {
      const value = Number(control.value);

      if (!Number.isFinite(value)) {
        return { invalidUnitPrice: true };
      }

      const code = String(productCode ?? '').trim();
      const description = String(productDescription ?? '')
        .trim()
        .toUpperCase();

      const isNegativeAdjustment =
        code === '3034' ||
        code === '3011' ||
        description.startsWith('DEVOLUCIONES Y DESCUENTOS');

      if (isNegativeAdjustment) {
        return null;
      }

      return value >= 0 ? null : { invalidUnitPrice: true };
    };
  }
}
