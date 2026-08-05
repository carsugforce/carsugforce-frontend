import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { finalize } from 'rxjs';

import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  PurchasesService,
  PurchaseDetail,
  PurchaseDetailItem,
  PurchaseHistoryItem,
} from '../../core/service/purchases.service';

import {
  PurchasePaymentFileResponse,
  PurchasePaymentHistoryItem,
  PurchasePaymentHistoryResponse,
  PurchasePaymentsService,
} from '../../core/service/purchase-payments.service';

import { SnackbarService } from '../../core/service/snackbar.service';

interface PurchaseDetailDialogData {
  purchaseId: number;
  canViewPurchaseHistory: boolean;
}

@Component({
  selector: 'app-purchase-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './purchase-detail-dialog.component.html',
  styleUrl: './purchase-detail-dialog.component.scss',
})
export class PurchaseDetailDialogComponent implements OnInit {
  loading = false;
  showPaymentHistoryDetail = false;
  loadingPaymentHistory = false;
  collapsedDocumentPayments = new Set<number>();
  purchase: PurchaseDetail | null = null;
  paymentHistory: PurchasePaymentHistoryResponse | null = null;

  itemSearch = '';
  historySearch = '';

  downloadingFileIds = new Set<number>();

  constructor(
    private purchasesService: PurchasesService,
    private purchasePaymentsService: PurchasePaymentsService,
    private snackbar: SnackbarService,
    private dialogRef: MatDialogRef<PurchaseDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PurchaseDetailDialogData,
  ) {}

  ngOnInit(): void {
    this.loadDetail();

    if (this.canViewHistory) {
      this.loadPaymentHistory();
    }
  }

  loadDetail(): void {
    this.loading = true;

    this.purchasesService
      .getPurchaseDetail(this.data.purchaseId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.purchase = res;
          this.itemSearch = '';
          this.historySearch = '';
        },
        error: () => {
          this.purchase = null;
          this.snackbar.error('No se pudo cargar el detalle de la compra.');
        },
      });
  }

  loadPaymentHistory(): void {
    this.loadingPaymentHistory = true;

    this.purchasePaymentsService
      .getPaymentHistoryByPurchase(this.data.purchaseId)
      .pipe(finalize(() => (this.loadingPaymentHistory = false)))
      .subscribe({
        next: (res) => {
          this.paymentHistory = res;
          this.collapsedDocumentPayments.clear();
        },
        error: () => {
          this.paymentHistory = null;
          this.snackbar.error('No se pudo cargar el historial de pagos.');
        },
      });
  }

  get canViewHistory(): boolean {
    return !!this.data?.canViewPurchaseHistory;
  }

  get paymentHistoryItems(): PurchasePaymentHistoryItem[] {
    return [...(this.paymentHistory?.payments || [])].sort((a, b) => {
      const dateA = new Date(a.paymentDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.paymentDate || b.createdAt || 0).getTime();

      if (dateB !== dateA) {
        return dateB - dateA;
      }

      return Number(b.paymentId || 0) - Number(a.paymentId || 0);
    });
  }

  get totalPaymentFiles(): number {
    return this.paymentHistoryItems.reduce((acc, payment) => {
      return acc + (payment.files?.length || 0);
    }, 0);
  }



  togglePaymentHistoryDetail(): void {
    this.showPaymentHistoryDetail = !this.showPaymentHistoryDetail;
  }

  close(): void {
    this.dialogRef.close(null);
  }

  edit(): void {
    if (!this.purchase) return;

    this.dialogRef.close({
      action: 'edit',
      purchaseId: this.purchase.id,
    });
  }

  get filteredItems(): PurchaseDetailItem[] {
    if (!this.purchase) return [];

    const term = this.normalize(this.itemSearch);

    if (!term) return this.purchase.items;

    return this.purchase.items.filter((item) => {
      const text = this.normalize(
        [
          item.productDescription,
          item.productId,
          item.lineNumber,
          item.unit,
          item.quantity,
          item.unitPrice,
          item.total,
        ].join(' '),
      );

      return text.includes(term);
    });
  }

  get filteredHistory(): PurchaseHistoryItem[] {
    if (!this.purchase) return [];

    const term = this.normalize(this.historySearch);

    if (!term) return this.purchase.history;

    return this.purchase.history.filter((event) => {
      const text = this.normalize(
        [
          event.eventType,
          event.description,
          event.createdAt,
          event.createdByUserId,
        ].join(' '),
      );

      return text.includes(term);
    });
  }

  getConditionLabel(condition: string): string {
    if (condition === 'CREDITO') return 'Crédito';
    if (condition === 'CONTADO') return 'Contado';
    return condition || 'Sin condición';
  }

  getPaymentLabel(paymentForm: string): string {
    const value = paymentForm?.toUpperCase();

    if (value === 'EFECTIVO') return 'Efectivo';
    if (value === 'SPEI') return 'SPEI';
    if (value === 'DEBITO') return 'Débito';
    if (value === 'ESPECIE') return 'Especie';
    if (value === 'CXC') return 'CxC';

    return paymentForm || 'Sin pago';
  }

  getDueLabel(): string {
    return this.purchase?.conditions === 'CREDITO'
      ? 'Día de corte'
      : 'Día de pago';
  }

  clearItemSearch(): void {
    this.itemSearch = '';
  }

  clearHistorySearch(): void {
    this.historySearch = '';
  }

  getPaymentStatusLabel(status: string | null | undefined): string {
    const value = String(status || '').toUpperCase();

    if (value === 'PAID') return 'Liquidado';
    if (value === 'PARTIAL') return 'Pago parcial';
    if (value === 'PENDING') return 'Pendiente';

    return status || 'Sin estado';
  }

  getFileTypeLabel(fileType: string | null | undefined): string {
    const value = String(fileType || '').toUpperCase();

    if (value === 'INVOICE') return 'Factura / documento relacionado';
    if (value === 'FISCAL_DOCUMENT') return 'pago';
    if (value === 'FACTURA') return 'Factura';
    if (value === 'COMPROBANTE_PAGO') return 'Comprobante de pago';

    return fileType || 'Documento';
  }

  getFileIcon(file: PurchasePaymentFileResponse): string {
    const name = String(file.originalFileName || '').toLowerCase();
    const contentType = String(file.contentType || '').toLowerCase();

    if (name.endsWith('.xml') || contentType.includes('xml')) return 'code';
    if (name.endsWith('.pdf') || contentType.includes('pdf'))
      return 'picture_as_pdf';
    if (contentType.includes('image')) return 'image';

    return 'description';
  }

  getFileSizeLabel(size: number | null | undefined): string {
    const bytes = Number(size || 0);

    if (bytes < 1024) return `${bytes} B`;

    const kb = bytes / 1024;

    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    return `${(kb / 1024).toFixed(1)} MB`;
  }

  isDownloadingFile(fileId: number): boolean {
    return this.downloadingFileIds.has(fileId);
  }

  downloadPaymentFile(file: PurchasePaymentFileResponse): void {
    if (!file?.id || this.isDownloadingFile(file.id)) return;

    this.downloadingFileIds.add(file.id);

    this.purchasePaymentsService
      .downloadPaymentFile(file.id)
      .pipe(
        finalize(() => {
          this.downloadingFileIds.delete(file.id);
        }),
      )
      .subscribe({
        next: (blob) => {
          this.downloadBlob(
            blob,
            file.originalFileName ||
              file.storedFileName ||
              `documento-${file.id}`,
          );
          this.snackbar.success('Documento descargado correctamente.');
        },
        error: () => {
          this.snackbar.error('No se pudo descargar el documento.');
        },
      });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();

    window.URL.revokeObjectURL(url);
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  getHistoryEventLabel(eventType: string | null | undefined): string {
    const key = String(eventType || '')
      .trim()
      .toUpperCase();

    const labels: Record<string, string> = {
      PURCHASE_CREATED: '🧾 Compra registrada',
      PAYMENT_DEFINED: '💳 Pago definido',
      CREDIT_ASSIGNED: '📆 Crédito asignado',

      PURCHASE_REVIEWED: '👁️ Compra revisada',

      SUPPLIER_CHANGED: '🚚 Proveedor modificado',
      PURCHASE_DATE_CHANGED: '📅 Fecha de compra modificada',
      DUE_DATE_CHANGED: '🕒 Fecha de pago/corte modificada',
      CONDITION_CHANGED: '🔁 Condición modificada',
      VOUCHER_CHANGED: '📄 Comprobante modificado',
      REFERENCE_CHANGED: '🏷️ Referencia modificada',
      UEN_CHANGED: '🏢 UEN modificada',
      OBSERVATIONS_CHANGED: '📝 Observaciones modificadas',

      PAYMENT_FORM_CHANGED: '💳 Forma de pago modificada',
      BANK_CHANGED: '🏦 Banco modificado',
      PAYMENT_REFERENCE_CHANGED: '🔖 Referencia de pago modificada',

      ITEM_ADDED: '📦 Partida agregada',
      ITEM_REMOVED: '🗑️ Partida eliminada',
      ITEM_PRODUCT_CHANGED: '🧺 Producto modificado',
      ITEM_QUANTITY_CHANGED: '⚖️ Cantidad modificada',
      ITEM_PRICE_CHANGED: '💲 Costo modificado',
      ITEM_TOTAL_CHANGED: '🧮 Importe modificado',
      ITEM_LINES_CHANGED: '📋 Partidas modificadas',

      TOTAL_CHANGED: '💰 Total modificado',
    };

    return labels[key] || `📌 ${this.toHumanEventLabel(key)}`;
  }

  private toHumanEventLabel(value: string): string {
    if (!value) return 'Movimiento';

    return value
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  get shouldShowPaymentHistorySection(): boolean {
    return (
      this.canViewHistory &&
      (this.loadingPaymentHistory || this.paymentHistoryItems.length > 0)
    );
  }

  hasPaymentFiles(payment: PurchasePaymentHistoryItem): boolean {
    return !!payment.files && payment.files.length > 0;
  }

  togglePaymentDocuments(paymentId: number): void {
    if (this.collapsedDocumentPayments.has(paymentId)) {
      this.collapsedDocumentPayments.delete(paymentId);
      return;
    }

    this.collapsedDocumentPayments.add(paymentId);
  }

  isPaymentDocumentsCollapsed(paymentId: number): boolean {
    return this.collapsedDocumentPayments.has(paymentId);
  }

  getPaymentItemStatusLabel(payment: PurchasePaymentHistoryItem): string {
    if (payment.isCancelled) return 'Cancelado';
    if (Number(payment.remainingBalance || 0) <= 0) return 'Liquidó compra';
    return 'Pago aplicado';
  }
}
