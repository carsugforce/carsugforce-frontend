import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { finalize } from 'rxjs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { MoneyInputDirective } from '../../../shared/directives/money-input.directive';
import { UserService } from '../../../core/service/user.service';

import {
  PurchaseSucursalOption,
  PurchasesService,
} from '../../../core/service/purchases.service';

import {
  SalesDailyEntry,
  SalesDailyEntrySaveRequest,
  SalesService,
} from '../../../core/service/sales.service';

import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  selector: 'app-sales-page',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MoneyInputDirective,
  ],

  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-MX',
    },
  ],

  templateUrl: './sales-page.component.html',
  styleUrl: './sales-page.component.scss',
})
export class SalesPageComponent implements OnInit {
  form!: FormGroup;

  sucursales: PurchaseSucursalOption[] = [];
  permissions: string[] = [];

  loadingPermissions = false;

  uenLocked = false;
  loadingCatalogs = false;

  loadingEntry = false;

  saving = false;

  currentEntry: SalesDailyEntry | null = null;

  private lookupVersion = 0;

  @ViewChild('existingSaleDialog')
  existingSaleDialog!: TemplateRef<unknown>;

  existingSaleNoticeSucursal = '';
  existingSaleNoticeDate = '';

  private lastExistingSaleNoticeKey: string | null = null;

  constructor(
    private fb: FormBuilder,

    private salesService: SalesService,

    private purchasesService: PurchasesService,

    private userService: UserService,

    private snackbar: SnackbarService,

    private dialog: MatDialog,
  ) {}

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
    this.buildForm();

    this.bindLookupRules();

    this.bindAssetSaleRules();

    this.loadSalesAccess();
  }

  // ============================================================
  // FORM
  // ============================================================

  private buildForm(): void {
    this.form = this.fb.group({
      // ========================================================
      // CONTEXTO
      // ========================================================

      saleDate: [this.getToday(), Validators.required],

      sucursalesId: [null, Validators.required],

      // ========================================================
      // VENTA EN SISTEMA
      // ========================================================

      systemOrders: [0, [Validators.required, Validators.min(0)]],

      systemCashRegister: [0, [Validators.required, Validators.min(0)]],

      // ========================================================
      // VENTA REAL
      // ========================================================

      realOrders: [0, [Validators.required, Validators.min(0)]],

      realCashRegister: [0, [Validators.required, Validators.min(0)]],

      // ========================================================
      // TRANSACCIONES
      // ========================================================

      ordersChecks: [0, [Validators.required, Validators.min(0)]],

      cashRegisterChecks: [0, [Validators.required, Validators.min(0)]],

      cancelledOrders: [0, [Validators.required, Validators.min(0)]],

      cancelledCashRegister: [0, [Validators.required, Validators.min(0)]],

      // ========================================================
      // CASH FLOW
      // ========================================================

      cash: [0, [Validators.required, Validators.min(0)]],

      tpv: [0, [Validators.required, Validators.min(0)]],

      spei: [0, [Validators.required, Validators.min(0)]],

      // ========================================================
      // CRÉDITO Y COBRANZA
      // ========================================================

      systemTickets: [0, [Validators.required, Validators.min(0)]],

      employeeTickets: [0, [Validators.required, Validators.min(0)]],

      systemCreditAmount: [0, [Validators.required, Validators.min(0)]],

      employeeCreditAmount: [0, [Validators.required, Validators.min(0)]],

      collectionAmount: [0, [Validators.required, Validators.min(0)]],

      returnsAmount: [0, [Validators.required, Validators.min(0)]],
      // ========================================================
      // VOLUMEN
      // ========================================================

      kilograms: [0, [Validators.required, Validators.min(0)]],

      pieces: [0, [Validators.required, Validators.min(0)]],

      // ========================================================
      // VENTA DE ACTIVOS
      // ========================================================

      assetSaleAmount: [0, [Validators.required, Validators.min(0)]],

      assetSalePaymentForm: [''],

      // ========================================================
      // OBSERVACIONES
      // ========================================================

      observations: [''],
    });
  }

  // ============================================================
  // BINDINGS
  // ============================================================

  private bindLookupRules(): void {
    this.form.get('sucursalesId')?.valueChanges.subscribe(() => {
      this.lookupCurrentEntry();
    });

    this.form.get('saleDate')?.valueChanges.subscribe(() => {
      this.lookupCurrentEntry();
    });
  }

  private bindAssetSaleRules(): void {
    this.form.get('assetSaleAmount')?.valueChanges.subscribe((value) => {
      const paymentFormControl = this.form.get('assetSalePaymentForm');

      const amount = this.toNumber(value);

      if (amount > 0) {
        paymentFormControl?.setValidators([Validators.required]);
      } else {
        paymentFormControl?.clearValidators();
      }

      paymentFormControl?.updateValueAndValidity({
        emitEvent: false,
      });
    });
  }

  // ============================================================
  // PERMISOS + SUCURSALES
  // ============================================================

  private loadSalesAccess(): void {
    this.loadingPermissions = true;

    this.userService
      .getMe()
      .pipe(
        finalize(() => {
          this.loadingPermissions = false;
        }),
      )
      .subscribe({
        next: (me: any) => {
          this.permissions = Array.isArray(me?.permissions)
            ? me.permissions
            : [];

          this.loadSucursales();
        },

        error: () => {
          this.permissions = [];

          this.sucursales = [];

          this.uenLocked = true;

          const control = this.form.get('sucursalesId');

          control?.reset(null, {
            emitEvent: false,
          });

          control?.disable({
            emitEvent: false,
          });

          this.snackbar.error('No se pudieron validar los permisos de UEN.');
        },
      });
  }

  // ============================================================
  // SUCURSALES AUTORIZADAS
  // ============================================================

  private loadSucursales(): void {
    this.loadingCatalogs = true;

    this.purchasesService
      .getPurchaseSucursales()
      .pipe(
        finalize(() => {
          this.loadingCatalogs = false;
        }),
      )
      .subscribe({
        next: (items) => {
          const allowedNames = this.getAllowedUenNames();

          this.sucursales = (items || []).filter((item) => {
            const name = this.normalizeUenName(item.description);

            return allowedNames.has(name);
          });

          this.applyUenLock();
        },

        error: () => {
          this.sucursales = [];

          this.uenLocked = true;

          const control = this.form.get('sucursalesId');

          control?.reset(null, {
            emitEvent: false,
          });

          control?.disable({
            emitEvent: false,
          });

          this.snackbar.error('No se pudieron cargar las UEN/Sucursales.');
        },
      });
  }

  // ============================================================
  // DETERMINAR UEN POR PERMISOS
  // ============================================================

  private getAllowedUenNames(): Set<string> {
    const allowed = new Set<string>();

    if (this.permissions.includes('sales.uen.belisario.view')) {
      allowed.add('belisario');
    }

    if (this.permissions.includes('sales.uen.santa-lucia.view')) {
      allowed.add('santa lucia');
    }

    if (this.permissions.includes('sales.uen.mayoristas.view')) {
      allowed.add('mayoristas');
    }

    return allowed;
  }

  // ============================================================
  // CANDADO DE UEN
  // ============================================================

  private applyUenLock(): void {
    const control = this.form.get('sucursalesId');

    // ==========================================================
    // SIN UEN AUTORIZADAS
    // ==========================================================

    if (this.sucursales.length === 0) {
      this.uenLocked = true;

      control?.reset(null, {
        emitEvent: false,
      });

      control?.disable({
        emitEvent: false,
      });

      this.currentEntry = null;

      this.snackbar.error(
        'Tu usuario no tiene ninguna UEN autorizada para capturar ventas.',
      );

      return;
    }

    // ==========================================================
    // SOLO UNA UEN
    //
    // AUTOSELECCIÓN + CANDADO
    // ==========================================================

    if (this.sucursales.length === 1) {
      const sucursal = this.sucursales[0];

      this.uenLocked = true;

      control?.enable({
        emitEvent: false,
      });

      control?.setValue(sucursal.id, {
        emitEvent: false,
      });

      control?.disable({
        emitEvent: false,
      });

      this.lookupCurrentEntry();

      return;
    }

    // ==========================================================
    // DOS O MÁS UEN
    //
    // EL USUARIO PUEDE SELECCIONAR ÚNICAMENTE ENTRE LAS
    // QUE TIENE AUTORIZADAS.
    // ==========================================================

    this.uenLocked = false;

    control?.enable({
      emitEvent: false,
    });

    const currentId = this.toNullableNumber(control?.value);

    const currentIsAllowed =
      currentId !== null && this.sucursales.some((x) => x.id === currentId);

    if (!currentIsAllowed) {
      control?.setValue(null, {
        emitEvent: false,
      });

      this.currentEntry = null;
    }
  }

  // ============================================================
  // NORMALIZAR NOMBRE UEN
  // ============================================================

  private normalizeUenName(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // ============================================================
  // VALIDAR UEN AUTORIZADA
  // ============================================================

  private isSelectedUenAllowed(): boolean {
    const id = this.toNullableNumber(this.form?.get('sucursalesId')?.value);

    if (!id) {
      return false;
    }

    return this.sucursales.some((x) => x.id === id);
  }

  // ============================================================
  // LOOKUP EXISTING ENTRY
  // ============================================================

  private lookupCurrentEntry(): void {
    const sucursalesId = this.toNullableNumber(
      this.form.get('sucursalesId')?.value,
    );

    const selectedDate = this.normalizeDate(this.form.get('saleDate')?.value);

    if (!sucursalesId || !selectedDate) {
      this.currentEntry = null;

      return;
    }

    // ==========================================================
    // SEGURIDAD FRONTEND UEN
    // ==========================================================

    const uenAllowed = this.sucursales.some((x) => x.id === sucursalesId);

    if (!uenAllowed) {
      this.currentEntry = null;

      return;
    }

    const saleDate = this.toApiDate(selectedDate);

    const lookupId = ++this.lookupVersion;

    this.loadingEntry = true;

    this.salesService
      .getDailyEntryByDate(sucursalesId, saleDate)
      .pipe(
        finalize(() => {
          if (lookupId === this.lookupVersion) {
            this.loadingEntry = false;
          }
        }),
      )
      .subscribe({
        next: (entry) => {
          if (lookupId !== this.lookupVersion) {
            return;
          }

          this.applyEntry(entry);

          this.showExistingSaleNotice(entry);
        },

        error: (err: HttpErrorResponse) => {
          if (lookupId !== this.lookupVersion) {
            return;
          }

          if (err.status === 404) {
            this.prepareNewEntry(sucursalesId, selectedDate);

            return;
          }

          this.currentEntry = null;

          this.snackbar.error(
            this.getErrorMessage(
              err,
              'No se pudo consultar la captura de ventas.',
            ),
          );
        },
      });
  }
  private showExistingSaleNotice(entry: SalesDailyEntry): void {
    const key = `${entry.sucursalesId}|${entry.saleDate}`;

    if (this.lastExistingSaleNoticeKey === key) {
      return;
    }

    this.lastExistingSaleNoticeKey = key;

    this.existingSaleNoticeSucursal =
      entry.sucursalName || this.selectedSucursalName;

    this.existingSaleNoticeDate = this.formatShortDate(
      this.parseApiDate(entry.saleDate),
    );

    this.dialog.open(this.existingSaleDialog, {
      width: '460px',
      maxWidth: '92vw',
      disableClose: true,
      autoFocus: false,
    });
  }
  // ============================================================
  // APPLY EXISTING ENTRY
  // ============================================================

  private applyEntry(entry: SalesDailyEntry): void {
    this.currentEntry = entry;

    this.form.patchValue(
      {
        saleDate: this.parseApiDate(entry.saleDate),

        sucursalesId: entry.sucursalesId,

        systemOrders: entry.systemOrders,

        systemCashRegister: entry.systemCashRegister,

        realOrders: entry.realOrders,

        realCashRegister: entry.realCashRegister,

        ordersChecks: entry.ordersChecks,

        cashRegisterChecks: entry.cashRegisterChecks,

        cancelledOrders: entry.cancelledOrders,

        cancelledCashRegister: entry.cancelledCashRegister,

        cash: entry.cash,

        tpv: entry.tpv,

        spei: entry.spei,

        systemTickets: entry.systemTickets,

        employeeTickets: entry.employeeTickets,

        systemCreditAmount: entry.systemCreditAmount,

        employeeCreditAmount: entry.employeeCreditAmount,

        collectionAmount: entry.collectionAmount ?? 0,

        returnsAmount: entry.returnsAmount ?? 0,

        kilograms: entry.kilograms ?? 0,

        pieces: entry.pieces ?? 0,

        assetSaleAmount: entry.assetSaleAmount,

        assetSalePaymentForm: entry.assetSalePaymentForm || '',

        observations: entry.observations || '',
      },
      {
        emitEvent: false,
      },
    );

    this.refreshAssetSaleValidator();

    this.form.markAsPristine();
  }

  // ============================================================
  // NEW ENTRY
  // ============================================================

  private prepareNewEntry(sucursalesId: number, saleDate: Date): void {
    this.lastExistingSaleNoticeKey = null;
    this.currentEntry = null;

    this.form.reset(
      {
        saleDate: new Date(saleDate),

        sucursalesId,

        systemOrders: 0,

        systemCashRegister: 0,

        realOrders: 0,

        realCashRegister: 0,

        ordersChecks: 0,

        cashRegisterChecks: 0,

        cancelledOrders: 0,

        cancelledCashRegister: 0,

        cash: 0,

        tpv: 0,

        spei: 0,

        systemTickets: 0,

        employeeTickets: 0,

        systemCreditAmount: 0,

        employeeCreditAmount: 0,

        collectionAmount: 0,

        returnsAmount: 0,

        kilograms: 0,

        pieces: 0,

        assetSaleAmount: 0,

        assetSalePaymentForm: '',

        observations: '',
      },
      {
        emitEvent: false,
      },
    );

    this.refreshAssetSaleValidator();

    this.form.markAsPristine();
  }

  // ============================================================
  // SAVE
  // ============================================================

  save(): void {
    if (this.saving || this.loadingEntry) {
      return;
    }

    if (
      !this.isSelectedUenAllowed()
    ) {
      this.snackbar.error(
        'No tienes permiso para capturar ventas en la UEN seleccionada.',
      );

      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      if (!this.form.get('sucursalesId')?.value) {
        this.snackbar.error('Selecciona una UEN/Sucursal.');

        return;
      }

      if (!this.normalizeDate(this.form.get('saleDate')?.value)) {
        this.snackbar.error('Selecciona una fecha válida.');

        return;
      }

      this.snackbar.error('Revisa los campos de la captura de ventas.');

      return;
    }

    // ==========================================================
    // CASH FLOW OBLIGATORIO
    // ==========================================================

    if (!this.cashFlowMatches) {
      this.snackbar.error(
        'El Cash Flow no cuadra con la Venta Real. Revisa Efectivo, TPV y SPEI antes de guardar.',
      );

      return;
    }

    const request = this.buildRequest();

    this.saving = true;

    const wasEdit = !!this.currentEntry?.id;

    const request$ = wasEdit
      ? this.salesService.updateDailyEntry(this.currentEntry!.id, request)
      : this.salesService.createDailyEntry(request);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (entry) => {
        this.applyEntry(entry);

        this.snackbar.success(
          wasEdit
            ? 'Captura de ventas actualizada correctamente.'
            : 'Captura de ventas registrada correctamente.',
        );
      },

      error: (err) => {
        this.snackbar.error(
          this.getErrorMessage(
            err,
            wasEdit
              ? 'No se pudo actualizar la captura de ventas.'
              : 'No se pudo registrar la captura de ventas.',
          ),
        );
      },
    });
  }

  // ============================================================
  // BUILD REQUEST
  // ============================================================

  private buildRequest(): SalesDailyEntrySaveRequest {
    const raw = this.form.getRawValue();

    const saleDate = this.normalizeDate(raw.saleDate);

    if (!saleDate) {
      throw new Error('Fecha de venta inválida.');
    }

    return {
      saleDate: this.toApiDate(saleDate),

      sucursalesId: Number(raw.sucursalesId),

      systemOrders: this.toNumber(raw.systemOrders),

      systemCashRegister: this.toNumber(raw.systemCashRegister),

      realOrders: this.toNumber(raw.realOrders),

      realCashRegister: this.toNumber(raw.realCashRegister),

      ordersChecks: this.toInteger(raw.ordersChecks),

      cashRegisterChecks: this.toInteger(raw.cashRegisterChecks),

      cancelledOrders: this.toInteger(raw.cancelledOrders),

      cancelledCashRegister: this.toInteger(raw.cancelledCashRegister),

      cash: this.toNumber(raw.cash),

      tpv: this.toNumber(raw.tpv),

      spei: this.toNumber(raw.spei),

      systemTickets: this.toInteger(raw.systemTickets),

      employeeTickets: this.toInteger(raw.employeeTickets),

      systemCreditAmount: this.toNumber(raw.systemCreditAmount),

      employeeCreditAmount: this.toNumber(raw.employeeCreditAmount),

      collectionAmount: this.toNumber(raw.collectionAmount),

      returnsAmount: this.toNumber(raw.returnsAmount),

      kilograms: this.toNumber(raw.kilograms),

      pieces: this.toInteger(raw.pieces),

      assetSaleAmount: this.toNumber(raw.assetSaleAmount),

      assetSalePaymentForm: this.clean(raw.assetSalePaymentForm),

      observations: this.clean(raw.observations),
    };
  }

  // ============================================================
  // CALCULATED VALUES
  // ============================================================

  get systemTotal(): number {
    return this.round(
      this.value('systemOrders') + this.value('systemCashRegister'),
    );
  }

  get realTotal(): number {
    return this.round(
      this.value('realOrders') + this.value('realCashRegister'),
    );
  }

  get variation(): number {
    return this.round(this.realTotal - this.systemTotal);
  }

  get checksQuantity(): number {
    return (
      this.integerValue('ordersChecks') +
      this.integerValue('cashRegisterChecks')
    );
  }

  get averageTicket(): number {
    if (this.checksQuantity <= 0) {
      return 0;
    }

    return this.round(this.realTotal / this.checksQuantity);
  }

  get cashFlowTotal(): number {
    return this.round(
      this.value('cash') + this.value('tpv') + this.value('spei'),
    );
  }

  get cashFlowDifference(): number {
    return this.round(this.cashFlowTotal - this.realTotal);
  }

  get cashFlowMatches(): boolean {
    return Math.abs(this.cashFlowDifference) <= 0.01;
  }

  // ============================================================
  // WEEK
  // ============================================================

  get selectedDate(): Date | null {
    return this.normalizeDate(this.form?.get('saleDate')?.value);
  }

  get weekNumber(): number {
    const date = this.selectedDate;

    if (!date) {
      return 0;
    }

    return this.getIsoWeekNumber(date);
  }

  get weekStartDate(): Date | null {
    const date = this.selectedDate;

    if (!date) {
      return null;
    }

    const result = new Date(date);

    result.setDate(result.getDate() - result.getDay());

    result.setHours(0, 0, 0, 0);

    return result;
  }

  get weekEndDate(): Date | null {
    const start = this.weekStartDate;

    if (!start) {
      return null;
    }

    const result = new Date(start);

    result.setDate(result.getDate() + 6);

    return result;
  }

  get weekStartText(): string {
    return this.formatShortDate(this.weekStartDate);
  }

  get weekEndText(): string {
    return this.formatShortDate(this.weekEndDate);
  }

  // ============================================================
  // PRESENTATION
  // ============================================================

  get selectedSucursalName(): string {
    const id = this.toNullableNumber(this.form?.get('sucursalesId')?.value);

    if (!id) {
      return 'Sin seleccionar';
    }

    return (
      this.sucursales.find((x) => x.id === id)?.description || 'Sin seleccionar'
    );
  }

  get isEditMode(): boolean {
    return !!this.currentEntry?.id;
  }

  get statusText(): string {
    if (this.loadingEntry) {
      return 'Consultando';
    }

    return this.isEditMode ? 'Captura existente' : 'Nueva captura';
  }

  get saveButtonText(): string {
    if (this.saving) {
      return this.isEditMode ? 'Actualizando...' : 'Guardando...';
    }

    return this.isEditMode ? 'Actualizar captura' : 'Guardar captura';
  }

  get saveButtonIcon(): string {
    if (this.saving) {
      return 'hourglass_top';
    }

    return this.isEditMode ? 'published_with_changes' : 'save';
  }

  // ============================================================
  // VALIDATORS
  // ============================================================

  private refreshAssetSaleValidator(): void {
    const amount = this.toNumber(this.form.get('assetSaleAmount')?.value);

    const control = this.form.get('assetSalePaymentForm');

    if (amount > 0) {
      control?.setValidators([Validators.required]);
    } else {
      control?.clearValidators();
    }

    control?.updateValueAndValidity({
      emitEvent: false,
    });
  }

  // ============================================================
  // DATE HELPERS
  // ============================================================

  private normalizeDate(value: unknown): Date | null {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return null;
      }

      const date = new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
      );

      date.setHours(0, 0, 0, 0);

      return date;
    }

    if (typeof value === 'string') {
      const onlyDate = value.trim().split('T')[0];

      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(onlyDate);

      if (!match) {
        return null;
      }

      const year = Number(match[1]);

      const month = Number(match[2]);

      const day = Number(match[3]);

      const date = new Date(year, month - 1, day);

      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        return null;
      }

      date.setHours(0, 0, 0, 0);

      return date;
    }

    return null;
  }

  private parseApiDate(value: string): Date {
    const parsed = this.normalizeDate(value);

    return parsed || this.getToday();
  }

  private getToday(): Date {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }

  private toApiDate(date: Date): string {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getIsoWeekNumber(date: Date): number {
    const target = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );

    const dayNumber = target.getUTCDay() || 7;

    target.setUTCDate(target.getUTCDate() + 4 - dayNumber);

    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));

    return Math.ceil(
      ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
  }

  private formatShortDate(date: Date | null): string {
    if (!date) {
      return '--';
    }

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  // ============================================================
  // GENERAL HELPERS
  // ============================================================

  private value(field: string): number {
    return this.toNumber(this.form?.get(field)?.value);
  }

  private integerValue(field: string): number {
    return this.toInteger(this.form?.get(field)?.value);
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);

    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return this.round(parsed);
  }

  private toInteger(value: unknown): number {
    const parsed = Number(value ?? 0);

    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.trunc(parsed);
  }

  private round(value: number): number {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  private clean(value: unknown): string | null {
    const text = String(value ?? '').trim();

    return text || null;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

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
