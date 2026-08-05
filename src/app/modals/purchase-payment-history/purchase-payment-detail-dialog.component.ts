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
  PurchasePaymentDetail,
  PurchasePaymentDetailItem,
  PurchasePaymentFileResponse,
  PurchasePaymentsService,
} from '../../core/service/purchase-payments.service';

import { SnackbarService } from '../../core/service/snackbar.service';

interface PurchasePaymentDetailDialogData {
  paymentId: number;
}

@Component({
  selector: 'app-purchase-payment-detail-dialog',
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
  templateUrl: './purchase-payment-detail-dialog.component.html',
  styleUrl: './purchase-payment-detail-dialog.component.scss',
})
export class PurchasePaymentDetailDialogComponent implements OnInit {
  loading = false;
  payment: PurchasePaymentDetail | null = null;

  collapsedDocuments = false;
  downloadingFileIds = new Set<number>();

  constructor(
    private purchasePaymentsService: PurchasePaymentsService,
    private snackbar: SnackbarService,
    private dialogRef: MatDialogRef<PurchasePaymentDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PurchasePaymentDetailDialogData,
  ) {}

  ngOnInit(): void {
    this.loadDetail();
  }

  loadDetail(): void {
    this.loading = true;

    this.purchasePaymentsService
      .getPaymentDetail(this.data.paymentId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.payment = res;
          this.collapsedDocuments = false;
        },
        error: () => {
          this.payment = null;
          this.snackbar.error('No se pudo cargar el detalle del pago.');
        },
      });
  }

  get items(): PurchasePaymentDetailItem[] {
    return this.payment?.items || [];
  }

  get files(): PurchasePaymentFileResponse[] {
    return this.payment?.files || [];
  }

  get hasFiles(): boolean {
    return this.files.length > 0;
  }

  close(): void {
    this.dialogRef.close(null);
  }

  toggleDocuments(): void {
    if (!this.hasFiles) return;
    this.collapsedDocuments = !this.collapsedDocuments;
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

  getPaymentStatusLabel(payment: PurchasePaymentDetail | null): string {
    if (!payment) return 'Sin estado';
    if (payment.isCancelled) return 'Cancelado';

    return 'Activo';
  }

  getPurchaseStatusLabel(status: string | null | undefined): string {
    const value = String(status || '').toUpperCase();

    if (value === 'PAID') return 'Liquidada';
    if (value === 'PARTIAL') return 'Parcial';
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
    if (name.endsWith('.pdf') || contentType.includes('pdf')) return 'picture_as_pdf';
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
            file.originalFileName || file.storedFileName || `documento-${file.id}`,
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
}