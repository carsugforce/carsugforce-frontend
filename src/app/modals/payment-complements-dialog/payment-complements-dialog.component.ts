import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  PurchasePaymentFileResponse,
  PurchasePaymentsService,
  UploadPurchasePaymentFile,
} from '../../core/service/purchase-payments.service';
import { SnackbarService } from '../../core/service/snackbar.service';

interface PaymentComplementsDialogData {
  paymentId: number;
  supplierName?: string | null;
  paymentDate?: string | null;
  paymentForm?: string | null;
  reference?: string | null;
  totalAmount?: number | null;
  isCancelled?: boolean;
}

interface PendingComplementFile {
  file: File;
}

@Component({
  selector: 'app-payment-complements-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './payment-complements-dialog.component.html',
  styleUrl: './payment-complements-dialog.component.scss',
})
export class PaymentComplementsDialogComponent implements OnInit {
  private purchasePaymentsService = inject(PurchasePaymentsService);
  private snackbar = inject(SnackbarService);

  loading = false;
  uploading = false;
  downloadingFileId: number | null = null;

  files: PurchasePaymentFileResponse[] = [];
  pendingFiles: PendingComplementFile[] = [];

  private changed = false;

  constructor(
    private dialogRef: MatDialogRef<PaymentComplementsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentComplementsDialogData,
  ) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  get canUpload(): boolean {
    return !this.data.isCancelled;
  }

  get hasPendingFiles(): boolean {
    return this.pendingFiles.length > 0;
  }

  loadFiles(): void {
    if (!this.data.paymentId) return;

    this.loading = true;

    this.purchasePaymentsService
      .getPaymentFiles(this.data.paymentId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (files) => {
          this.files = files || [];
        },
        error: (err) => {
          this.files = [];
          this.snackbar.error(
            this.getErrorMessage(err, 'No se pudieron cargar los complementos de pago.'),
          );
        },
      });
  }

  onFilesSelected(event: Event): void {
    if (!this.canUpload) return;

    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files || []);

    if (selectedFiles.length === 0) return;

    const allowedExtensions = ['pdf', 'xml', 'jpg', 'jpeg', 'png'];
    const maxSize = 10 * 1024 * 1024;

    for (const file of selectedFiles) {
      const extension = this.getExtension(file.name);

      if (!allowedExtensions.includes(extension)) {
        this.snackbar.warning(
          `El archivo ${file.name} no es válido. Solo PDF, XML, JPG o PNG.`,
        );
        continue;
      }

      if (file.size > maxSize) {
        this.snackbar.warning(
          `El archivo ${file.name} excede el máximo de 10 MB.`,
        );
        continue;
      }

      const alreadyAdded = this.pendingFiles.some(
        (x) => x.file.name === file.name && x.file.size === file.size,
      );

      if (alreadyAdded) continue;

      this.pendingFiles.push({
        file,
      });
    }

    input.value = '';
  }

  removePendingFile(index: number): void {
    if (this.uploading) return;
    this.pendingFiles.splice(index, 1);
  }

  upload(): void {
    if (this.uploading || !this.canUpload) return;

    if (!this.data.paymentId) {
      this.snackbar.error('No se encontró el pago seleccionado.');
      return;
    }

    if (this.pendingFiles.length === 0) {
      this.snackbar.warning('Selecciona al menos un complemento de pago.');
      return;
    }

    const files: UploadPurchasePaymentFile[] = this.pendingFiles.map((item) => ({
      file: item.file,
      category: 'COMPROBANTE_PAGO',
    }));

    this.uploading = true;

    this.purchasePaymentsService
      .uploadPaymentFiles(this.data.paymentId, files)
      .pipe(finalize(() => (this.uploading = false)))
      .subscribe({
        next: () => {
          this.snackbar.success('Complementos de pago cargados correctamente.');
          this.changed = true;
          this.pendingFiles = [];
          this.loadFiles();
        },
        error: (err) => {
          this.snackbar.error(
            this.getErrorMessage(err, 'No se pudieron subir los complementos de pago.'),
          );
        },
      });
  }

  download(file: PurchasePaymentFileResponse): void {
    if (!file?.id || this.downloadingFileId) return;

    this.downloadingFileId = file.id;

    this.purchasePaymentsService
      .downloadPaymentFile(file.id)
      .pipe(finalize(() => (this.downloadingFileId = null)))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');

          link.href = url;
          link.download = file.originalFileName || 'complemento-pago';
          link.click();

          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          this.snackbar.error(
            this.getErrorMessage(err, 'No se pudo descargar el complemento de pago.'),
          );
        },
      });
  }

  close(): void {
    if (this.uploading) return;

    this.dialogRef.close({
      changed: this.changed,
    });
  }

  getFileIcon(file: PurchasePaymentFileResponse | PendingComplementFile): string {
    const fileName =
      'originalFileName' in file ? file.originalFileName : file.file.name;

    const extension = this.getExtension(fileName);

    if (extension === 'pdf') return 'picture_as_pdf';
    if (extension === 'xml') return 'code';
    if (extension === 'jpg' || extension === 'jpeg' || extension === 'png') {
      return 'image';
    }

    return 'description';
  }

  getFileSizeLabel(size: number): string {
    if (!size) return '0 KB';

    if (size < 1024 * 1024) {
      return `${Math.ceil(size / 1024)} KB`;
    }

    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }

  getFileTypeLabel(fileType: string): string {
    const value = String(fileType || '').toUpperCase();

    if (value === 'COMPROBANTE_PAGO') return 'Complemento de pago';
    if (value === 'PAYMENT_RECEIPT') return 'Comprobante de pago';
    if (value === 'PAYMENT_DOCUMENT') return 'Documento de pago';

    return fileType || 'Complemento de pago';
  }

  private getExtension(fileName: string): string {
    const parts = String(fileName || '').split('.');

    if (parts.length <= 1) return '';

    return parts[parts.length - 1].toLowerCase();
  }

  private getErrorMessage(err: any, fallback: string): string {
    if (typeof err?.error === 'string' && err.error.trim()) {
      return err.error;
    }

    if (typeof err?.error?.message === 'string' && err.error.message.trim()) {
      return err.error.message;
    }

    if (typeof err?.error?.detail === 'string' && err.error.detail.trim()) {
      return err.error.detail;
    }

    return fallback;
  }
}