import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatNativeDateModule,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';

import { UserService } from '../../../core/service/user.service';

import {
  PurchasesService,
  PurchaseListItem,
  PurchaseListQuery,
  PurchaseSucursalOption,
  PurchaseVehicleOption,
} from '../../../core/service/purchases.service';

import { SnackbarService } from '../../../core/service/snackbar.service';

import { PurchaseDetailDialogComponent } from '../../../modals/purchase-detail-dialog/purchase-detail-dialog.component';
import { PurchaseDebtDetailDialogComponent } from '../../../modals/purchase-debt-detail-dialog/purchase-debt-detail-dialog.component';
import { CreatePurchaseRecurrenceDialogComponent } from '../../../modals/create-purchase-recurrence-dialog/create-purchase-recurrence-dialog.component';
import { PurchaseDocumentsDialogComponent } from '../../../modals/purchase-documents-dialog/purchase-documents-dialog.component';

type QuickFilter =
  | 'ALL'
  | 'CONTADO'
  | 'CREDITO'
  | 'TODAY'
  | 'WEEK'
  | 'MONTH'
  | null;

@Component({
  selector: 'app-my-purchases',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-MX',
    },
  ],
  templateUrl: './my-purchases.component.html',
  styleUrl: './my-purchases.component.scss',
})
export class MyPurchasesComponent implements OnInit {
  constructor(
    private purchasesService: PurchasesService,
    private snackbar: SnackbarService,
    private router: Router,
    private dialog: MatDialog,
    private userService: UserService,
  ) {}

  private fb = inject(FormBuilder);

  loading = false;
  loadingCatalogs = false;

  purchases: PurchaseListItem[] = [];

  total = 0;
  debtAmount = 0;

  canViewPurchaseHistory = false;

  /**
   * Controla los botones:
   * - Copiar compra
   * - Crear compra recurrente
   *
   * Solo Admin y SuperAdmin.
   */
  canManagePurchaseActions = false;

  page = 1;
  pageSize = 20;

  activeQuickFilter: QuickFilter = 'ALL';

  sucursales: PurchaseSucursalOption[] = [];
  vehicles: PurchaseVehicleOption[] = [];

  downloadingPurchasesPdf = false;
  downloadingCxPPdf = false;

  filtersForm = this.fb.group({
    search: [''],
    searchType: ['ALL'],
    condition: [''],
    paymentForm: [''],
    sucursalesId: [null as number | null],
    vehicleId: [null as number | null],
    dateFrom: [null as Date | null],
    dateTo: [null as Date | null],
  });

  conditionOptions = [
    {
      value: '',
      label: 'Todas',
    },
    {
      value: 'CONTADO',
      label: 'Contado',
    },
    {
      value: 'CREDITO',
      label: 'Crédito',
    },
  ];

  paymentFormOptions = [
    {
      value: '',
      label: 'Todas',
    },
    {
      value: 'EFECTIVO',
      label: 'Efectivo',
    },
    {
      value: 'SPEI',
      label: 'SPEI',
    },
    {
      value: 'DEBITO',
      label: 'Débito',
    },
    {
      value: 'ESPECIE',
      label: 'Especie',
    },
    {
      value: 'CXC',
      label: 'CxC',
    },
  ];

  ngOnInit(): void {
    this.loadCurrentUserPermissions();
    this.loadCatalogs();
    this.loadPurchases();
    this.loadDebtTotal();

    this.filtersForm.valueChanges
      .pipe(debounceTime(250))
      .subscribe(() => {
        this.activeQuickFilter = null;
        this.page = 1;
        this.loadPurchases();
      });
  }

  loadCatalogs(): void {
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
          this.sucursales = items || [];
        },
        error: () => {
          this.snackbar.error(
            'No se pudieron cargar las UEN/Sucursales.',
          );
        },
      });

    this.purchasesService
      .getPurchaseVehicles()
      .subscribe({
        next: (items) => {
          this.vehicles = items || [];
        },
        error: () => {
          this.snackbar.error(
            'No se pudieron cargar los vehículos.',
          );
        },
      });
  }

  loadPurchases(): void {
    this.loading = true;

    const query = this.buildCurrentQuery();

    this.purchasesService
      .getPurchases(query)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.purchases = res.items ?? [];
          this.total = res.total ?? 0;
          this.page = res.page ?? this.page;
          this.pageSize = res.pageSize ?? this.pageSize;
        },
        error: (err) => {
          this.purchases = [];
          this.total = 0;

          this.snackbar.error(
            this.getErrorMessage(err),
          );
        },
      });
  }

  applyQuickFilter(filter: QuickFilter): void {
    this.activeQuickFilter = filter;
    this.page = 1;

    if (filter === 'ALL') {
      this.filtersForm.reset(
        {
          search: '',
          searchType: 'ALL',
          condition: '',
          paymentForm: '',
          sucursalesId: null,
          vehicleId: null,
          dateFrom: null,
          dateTo: null,
        },
        {
          emitEvent: false,
        },
      );

      this.loadPurchases();
      return;
    }

    if (
      filter === 'CONTADO' ||
      filter === 'CREDITO'
    ) {
      this.filtersForm.patchValue(
        {
          condition: filter,
          dateFrom: null,
          dateTo: null,
        },
        {
          emitEvent: false,
        },
      );

      this.loadPurchases();
      return;
    }

    const range = this.getDateRange(filter);

    this.filtersForm.patchValue(
      {
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      },
      {
        emitEvent: false,
      },
    );

    this.loadPurchases();
  }

  clearFilters(): void {
    this.activeQuickFilter = 'ALL';
    this.page = 1;

    this.filtersForm.reset(
      {
        search: '',
        searchType: 'ALL',
        condition: '',
        paymentForm: '',
        sucursalesId: null,
        vehicleId: null,
        dateFrom: null,
        dateTo: null,
      },
      {
        emitEvent: false,
      },
    );

    this.loadPurchases();
  }

  goToCreate(): void {
    this.router.navigate(['/compras/new']);
  }

  viewPurchase(
    purchase: PurchaseListItem,
  ): void {
    const dialogRef = this.dialog.open(
      PurchaseDetailDialogComponent,
      {
        panelClass: 'custom-dialog-panel',
        autoFocus: false,
        restoreFocus: false,
        disableClose: true,
        data: {
          purchaseId: purchase.id,
          canViewPurchaseHistory:
            this.canViewPurchaseHistory,
        },
      },
    );

    dialogRef
      .afterClosed()
      .subscribe((result) => {
        if (
          !result ||
          result.action !== 'edit'
        ) {
          return;
        }

        this.router.navigate([
          '/compras/edit',
          result.purchaseId,
        ]);
      });
  }

  editPurchase(
    purchase: PurchaseListItem,
  ): void {
    this.router.navigate([
      '/compras/edit',
      purchase.id,
    ]);
  }

  nextPage(): void {
    if (!this.hasNextPage) {
      return;
    }

    this.page++;
    this.loadPurchases();
  }

  previousPage(): void {
    if (this.page <= 1) {
      return;
    }

    this.page--;
    this.loadPurchases();
  }

  get hasNextPage(): boolean {
    return (
      this.page * this.pageSize <
      this.total
    );
  }

  get fromRecord(): number {
    if (this.total === 0) {
      return 0;
    }

    return (
      (this.page - 1) *
        this.pageSize +
      1
    );
  }

  get toRecord(): number {
    return Math.min(
      this.page * this.pageSize,
      this.total,
    );
  }

  get totalAmount(): number {
    return this.purchases.reduce(
      (acc, item) =>
        acc + Number(item.total || 0),
      0,
    );
  }

  get creditCount(): number {
    return this.purchases.filter(
      (item) =>
        item.conditions === 'CREDITO',
    ).length;
  }

  get cashCount(): number {
    return this.purchases.filter(
      (item) =>
        item.conditions === 'CONTADO',
    ).length;
  }

  get hasFilters(): boolean {
    const raw =
      this.filtersForm.getRawValue();

    return !!(
      this.clean(raw.search) ||
      this.clean(raw.condition) ||
      this.clean(raw.paymentForm) ||
      this.toNullableNumber(
        raw.sucursalesId,
      ) ||
      this.toNullableNumber(
        raw.vehicleId,
      ) ||
      raw.dateFrom ||
      raw.dateTo
    );
  }

  loadDebtTotal(): void {
    this.purchasesService
      .getDebtTotal()
      .subscribe({
        next: (res) => {
          this.debtAmount = Number(
            res?.debtTotal || 0,
          );
        },
        error: () => {
          this.debtAmount = 0;
        },
      });
  }

  getConditionLabel(
    condition: string,
  ): string {
    if (condition === 'CREDITO') {
      return 'Crédito';
    }

    if (condition === 'CONTADO') {
      return 'Contado';
    }

    return condition || 'Sin condición';
  }

  getPaymentLabel(
    paymentForm: string,
  ): string {
    const value =
      paymentForm?.toUpperCase();

    if (value === 'EFECTIVO') {
      return 'Efectivo';
    }

    if (value === 'SPEI') {
      return 'SPEI';
    }

    if (value === 'DEBITO') {
      return 'Débito';
    }

    if (value === 'ESPECIE') {
      return 'Especie';
    }

    if (value === 'CXC') {
      return 'CxC';
    }

    return paymentForm || 'Sin pago';
  }

  getPaymentClass(
    paymentForm: string,
  ): string {
    const value =
      paymentForm?.toUpperCase();

    if (value === 'EFECTIVO') {
      return 'payment-cash';
    }

    if (value === 'SPEI') {
      return 'payment-spei';
    }

    if (value === 'DEBITO') {
      return 'payment-card';
    }

    if (value === 'ESPECIE') {
      return 'payment-kind';
    }

    if (value === 'CXC') {
      return 'payment-cxc';
    }

    return 'payment-default';
  }

  getDueLabel(
    purchase: PurchaseListItem,
  ): string {
    return purchase.conditions ===
      'CREDITO'
      ? 'Corte'
      : 'Pago';
  }

  getVehicleDisplay(
    purchase: PurchaseListItem,
  ): string {
    if (!purchase.vehicleName) {
      return 'Sin vehículo';
    }

    if (purchase.vehiclePlate) {
      return `${purchase.vehicleName} (${purchase.vehiclePlate})`;
    }

    return purchase.vehicleName;
  }

  downloadTicket(purchase: any): void {
    if (!purchase?.id) {
      return;
    }

    this.purchasesService
      .downloadPurchaseTicket(
        purchase.id,
      )
      .subscribe({
        next: (blob) => {
          const fileName =
            `ticket-${purchase.folio || purchase.id}.pdf`;

          const url =
            window.URL.createObjectURL(
              blob,
            );

          const anchor =
            document.createElement('a');

          anchor.href = url;
          anchor.download = fileName;
          anchor.click();

          window.URL.revokeObjectURL(
            url,
          );
        },
        error: () => {
          this.snackbar.error(
            'No se pudo generar el ticket.',
          );
        },
      });
  }

  copyPurchase(
    purchase: PurchaseListItem,
  ): void {
    if (!this.canManagePurchaseActions) {
      this.snackbar.error(
        'No tienes permiso para copiar compras.',
      );
      return;
    }

    if (!purchase?.id) {
      this.snackbar.error(
        'No se encontró la compra para copiar.',
      );
      return;
    }

    this.purchasesService
      .getCopyTemplate(purchase.id)
      .subscribe({
        next: (template) => {
          this.snackbar.success(
            `Compra ${template.sourceFolio} preparada para copiar.`,
          );

          this.router.navigate(
            ['/compras/new'],
            {
              state: {
                copyTemplate: template,
              },
            },
          );
        },
        error: (err) => {
          this.snackbar.error(
            this.getErrorMessage(err) ||
              'No se pudo preparar la copia de la compra.',
          );
        },
      });
  }

  private getDateRange(
    filter: QuickFilter,
  ): {
    dateFrom: Date | null;
    dateTo: Date | null;
  } {
    const today = this.getToday();

    if (filter === 'TODAY') {
      return {
        dateFrom: today,
        dateTo: today,
      };
    }

    if (filter === 'WEEK') {
      const start = new Date(today);

      const day = start.getDay();
      const diffToMonday =
        (day + 6) % 7;

      start.setDate(
        start.getDate() -
          diffToMonday,
      );

      const end = new Date(start);

      end.setDate(
        start.getDate() + 6,
      );

      return {
        dateFrom: start,
        dateTo: end,
      };
    }

    if (filter === 'MONTH') {
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );

      const end = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      );

      return {
        dateFrom: start,
        dateTo: end,
      };
    }

    return {
      dateFrom: null,
      dateTo: null,
    };
  }

  private clean(
    value: unknown,
  ): string | null {
    const parsed = String(
      value ?? '',
    ).trim();

    return parsed
      ? parsed
      : null;
  }

  private toNullableNumber(
    value: unknown,
  ): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const parsed = Number(value);

    return (
      Number.isFinite(parsed) &&
      parsed > 0
    )
      ? parsed
      : null;
  }

  private getToday(): Date {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }

  private toInputDate(
    date: Date,
  ): string {
    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1,
    ).padStart(2, '0');

    const day = String(
      date.getDate(),
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getErrorMessage(
    err: any,
  ): string {
    if (
      typeof err?.error === 'string' &&
      err.error.trim()
    ) {
      return err.error;
    }

    if (
      typeof err?.error?.message ===
        'string' &&
      err.error.message.trim()
    ) {
      return err.error.message;
    }

    if (
      typeof err?.error?.title ===
        'string' &&
      err.error.title.trim()
    ) {
      return err.error.title;
    }

    return 'No se pudieron cargar las compras';
  }

  private buildCurrentQuery(): PurchaseListQuery {
    const raw =
      this.filtersForm.getRawValue();

    return {
      search: this.clean(raw.search),
      searchType: this.clean(
        raw.searchType,
      ),
      condition: this.clean(
        raw.condition,
      ),
      paymentForm: this.clean(
        raw.paymentForm,
      ),
      sucursalesId:
        this.toNullableNumber(
          raw.sucursalesId,
        ),
      vehicleId:
        this.toNullableNumber(
          raw.vehicleId,
        ),
      dateFrom: this.toApiDate(
        raw.dateFrom,
      ),
      dateTo: this.toApiDate(
        raw.dateTo,
      ),
      page: this.page,
      pageSize: this.pageSize,
    };
  }

  downloadPurchasesPdf(): void {
    if (
      this.downloadingPurchasesPdf
    ) {
      return;
    }

    this.downloadingPurchasesPdf =
      true;

    const query =
      this.buildCurrentQuery();

    this.purchasesService
      .downloadPurchasesPdf(query)
      .pipe(
        finalize(() => {
          this.downloadingPurchasesPdf =
            false;
        }),
      )
      .subscribe({
        next: (blob) => {
          this.downloadBlob(
            blob,
            `registro-compras-${this.getFileDate()}.pdf`,
          );
        },
        error: (err) => {
          this.snackbar.error(
            this.getErrorMessage(err) ||
              'No se pudo generar el PDF de compras.',
          );
        },
      });
  }

  downloadAccountsPayablePdf(): void {
    if (this.downloadingCxPPdf) {
      return;
    }

    this.downloadingCxPPdf = true;

    const query =
      this.buildCurrentQuery();

    this.purchasesService
      .downloadAccountsPayablePdf(
        query,
      )
      .pipe(
        finalize(() => {
          this.downloadingCxPPdf =
            false;
        }),
      )
      .subscribe({
        next: (blob) => {
          this.downloadBlob(
            blob,
            `cuentas-por-pagar-${this.getFileDate()}.pdf`,
          );
        },
        error: (err) => {
          this.snackbar.error(
            this.getErrorMessage(err) ||
              'No se pudo generar el PDF de cuentas por pagar.',
          );
        },
      });
  }

  private downloadBlob(
    blob: Blob,
    fileName: string,
  ): void {
    const url =
      window.URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();

    window.URL.revokeObjectURL(url);
  }

  private getFileDate(): string {
    const now = new Date();

    const year =
      now.getFullYear();

    const month = String(
      now.getMonth() + 1,
    ).padStart(2, '0');

    const day = String(
      now.getDate(),
    ).padStart(2, '0');

    const hour = String(
      now.getHours(),
    ).padStart(2, '0');

    const minute = String(
      now.getMinutes(),
    ).padStart(2, '0');

    return `${year}${month}${day}-${hour}${minute}`;
  }

  openDebtDetail(): void {
    this.dialog.open(
      PurchaseDebtDetailDialogComponent,
      {
        panelClass:
          'custom-dialog-panel',
        autoFocus: false,
        restoreFocus: false,
        disableClose: true,
        data: {
          purchaseId:
            this.debtAmount,
        },
      },
    );
  }

  loadCurrentUserPermissions(): void {
    this.userService
      .getMe()
      .subscribe({
        next: (res: any) => {
          const permissions =
            this.extractPermissions(res);

          this.canViewPurchaseHistory =
            permissions.includes(
              'purchases.history',
            );

          this.canManagePurchaseActions =
            this.hasAdminOrSuperAdminRole(
              res,
            );

          if (
            !this.canViewPurchaseHistory
          ) {
            this.filtersForm.patchValue(
              {
                dateFrom: null,
                dateTo: null,
              },
              {
                emitEvent: false,
              },
            );

            if (
              this.activeQuickFilter ===
                'WEEK' ||
              this.activeQuickFilter ===
                'MONTH'
            ) {
              this.activeQuickFilter =
                'TODAY';
            }
          }
        },
        error: () => {
          this.canViewPurchaseHistory =
            false;

          this.canManagePurchaseActions =
            false;
        },
      });
  }

  openCreateRecurrence(
    purchase: PurchaseListItem,
  ): void {
    if (!this.canManagePurchaseActions) {
      this.snackbar.error(
        'No tienes permiso para crear compras recurrentes.',
      );
      return;
    }

    if (!purchase?.id) {
      this.snackbar.error(
        'No se encontró la compra para crear recurrencia.',
      );
      return;
    }

    const dialogRef =
      this.dialog.open(
        CreatePurchaseRecurrenceDialogComponent,
        {
          autoFocus: false,
          restoreFocus: false,
          panelClass:
            'custom-dialog-panel',
          data: {
            purchase,
          },
        },
      );

    dialogRef
      .afterClosed()
      .subscribe((result) => {
        if (!result?.created) {
          return;
        }

        this.snackbar.success(
          'Recurrencia creada correctamente.',
        );
      });
  }

  openPurchaseDocuments(
    purchase: PurchaseListItem,
  ): void {
    if (!purchase?.id) {
      this.snackbar.error(
        'No se encontró la compra para consultar documentos.',
      );
      return;
    }

    this.dialog.open(
      PurchaseDocumentsDialogComponent,
      {
        autoFocus: false,
        restoreFocus: false,
        panelClass:
          'custom-dialog-panel',
        data: {
          purchase,
        },
      },
    );
  }

  private toApiDate(
    value:
      | Date
      | string
      | null
      | undefined,
  ): string | null {
    if (!value) {
      return null;
    }

    const date =
      value instanceof Date
        ? value
        : new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return null;
    }

    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1,
    ).padStart(2, '0');

    const day = String(
      date.getDate(),
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Obtiene las llaves de permisos sin importar
   * si el backend devuelve camelCase o PascalCase.
   */
  private extractPermissions(
    response: any,
  ): string[] {
    const rawPermissions =
      response?.permissions ??
      response?.Permissions ??
      response?.permissionKeys ??
      response?.PermissionKeys ??
      response?.user?.permissions ??
      response?.user?.Permissions ??
      [];

    if (!Array.isArray(rawPermissions)) {
      return [];
    }

    return rawPermissions
      .map((permission: any) => {
        if (
          typeof permission ===
          'string'
        ) {
          return permission.trim();
        }

        return String(
          permission?.key ??
            permission?.Key ??
            permission?.name ??
            permission?.Name ??
            permission?.permissionKey ??
            permission?.PermissionKey ??
            '',
        ).trim();
      })
      .filter(
        (permission: string) =>
          permission.length > 0,
      );
  }

  /**
   * Valida distintos formatos posibles de la
   * respuesta de getMe().
   */
  private hasAdminOrSuperAdminRole(
    response: any,
  ): boolean {
    const roleSources: unknown[] = [
      response?.role,
      response?.Role,
      response?.roleName,
      response?.RoleName,
      response?.roles,
      response?.Roles,

      response?.user?.role,
      response?.user?.Role,
      response?.user?.roleName,
      response?.user?.RoleName,
      response?.user?.roles,
      response?.user?.Roles,

      response?.data?.role,
      response?.data?.Role,
      response?.data?.roleName,
      response?.data?.RoleName,
      response?.data?.roles,
      response?.data?.Roles,
    ];

    const normalizedRoles =
      roleSources
        .flatMap((source) =>
          this.extractRoleNames(
            source,
          ),
        )
        .map((role) =>
          this.normalizeRole(role),
        )
        .filter(
          (role) => role.length > 0,
        );

    const allowedRoles = new Set([
      'ADMIN',
      'ADMINISTRATOR',
      'ADMINISTRADOR',
      'SUPERADMIN',
      'SUPERADMINISTRATOR',
      'SUPERADMINISTRADOR',
    ]);

    return normalizedRoles.some(
      (role) =>
        allowedRoles.has(role),
    );
  }

  /**
   * Extrae el nombre del rol cuando viene como:
   * - "Admin"
   * - ["Admin"]
   * - { name: "Admin" }
   * - { roleName: "Admin" }
   */
  private extractRoleNames(
    value: unknown,
  ): string[] {
    if (
      value === null ||
      value === undefined
    ) {
      return [];
    }

    if (typeof value === 'string') {
      return [value];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) =>
        this.extractRoleNames(item),
      );
    }

    if (typeof value === 'object') {
      const role =
        value as Record<
          string,
          unknown
        >;

      const possibleValues = [
        role['name'],
        role['Name'],
        role['roleName'],
        role['RoleName'],
        role['code'],
        role['Code'],
        role['description'],
        role['Description'],
      ];

      return possibleValues.flatMap(
        (item) =>
          this.extractRoleNames(item),
      );
    }

    return [];
  }

  private normalizeRole(
    role: string,
  ): string {
    return role
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .replace(/[\s_-]+/g, '');
  }
}