import { CommonModule, DatePipe } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';

import {
  PurchaseFile,
  PurchaseListItem,
  PurchasesService,
} from '../../core/service/purchases.service';
import { SnackbarService } from '../../core/service/snackbar.service';

interface PurchaseDocumentsDialogData {
  purchase: PurchaseListItem;
}

interface PendingPurchaseFile {
  file: File;
  category: string;
}

@Component({
  selector: 'app-purchase-documents-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './purchase-documents-dialog.component.html',
  styleUrl: './purchase-documents-dialog.component.scss',
})
export class PurchaseDocumentsDialogComponent {
  private purchasesService = inject(PurchasesService);
  private snackbar = inject(SnackbarService);

  loading = false;
  uploading = false;
  downloadingFileId: number | null = null;

  files: PurchaseFile[] = [];
  pendingFiles: PendingPurchaseFile[] = [];

  categoryOptions = [
    {
      value: 'INVOICE',
      label: 'Factura',
      icon: 'receipt_long',
    },
    {
      value: 'FISCAL_DOCUMENT',
      label: 'Documento fiscal',
      icon: 'description',
    },
    {
      value: 'PURCHASE_DOCUMENT',
      label: 'Documento de compra',
      icon: 'folder',
    },
  ];

  constructor(
    private dialogRef: MatDialogRef<PurchaseDocumentsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PurchaseDocumentsDialogData,
  ) {
    this.loadFiles();
  }

  get purchase(): PurchaseListItem {
    return this.data.purchase;
  }

  get hasPendingFiles(): boolean {
    return this.pendingFiles.length > 0;
  }

  loadFiles(): void {
    if (!this.purchase?.id) return;

    this.loading = true;

    this.purchasesService
      .getPurchaseFiles(this.purchase.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (files) => {
          this.files = files || [];
        },
        error: (err) => {
          this.files = [];
          this.snackbar.error(
            this.getErrorMessage(err, 'No se pudieron cargar los documentos.'),
          );
        },
      });
  }

  onFilesSelected(event: Event): void {
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
        category: 'PURCHASE_DOCUMENT',
      });
    }

    input.value = '';
  }

  removePendingFile(index: number): void {
    this.pendingFiles.splice(index, 1);
  }

  upload(): void {
    if (!this.purchase?.id || this.uploading) return;

    if (this.pendingFiles.length === 0) {
      this.snackbar.warning('Selecciona al menos un documento.');
      return;
    }

    const files = this.pendingFiles.map((x) => x.file);
    const categories = this.pendingFiles.map((x) => x.category);

    this.uploading = true;

    this.purchasesService
      .uploadPurchaseFiles(this.purchase.id, files, categories)
      .pipe(finalize(() => (this.uploading = false)))
      .subscribe({
        next: () => {
          this.snackbar.success('Documentos cargados correctamente.');
          this.pendingFiles = [];
          this.loadFiles();
        },
        error: (err) => {
          this.snackbar.error(
            this.getErrorMessage(err, 'No se pudieron subir los documentos.'),
          );
        },
      });
  }

  download(file: PurchaseFile): void {
    if (!file?.id || this.downloadingFileId) return;

    this.downloadingFileId = file.id;

    this.purchasesService
      .downloadPurchaseFile(file.id)
      .pipe(finalize(() => (this.downloadingFileId = null)))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');

          link.href = url;
          link.download = file.originalFileName || 'documento';
          link.click();

          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          this.snackbar.error(
            this.getErrorMessage(err, 'No se pudo descargar el documento.'),
          );
        },
      });
  }

  close(): void {
    if (this.uploading) return;
    this.dialogRef.close({
      changed: true,
    });
  }

  getFileIcon(file: PurchaseFile | PendingPurchaseFile): string {
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
    const option = this.categoryOptions.find((x) => x.value === fileType);

    return option?.label || fileType || 'Documento';
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