import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { finalize } from 'rxjs';
import {
  PurchaseDebtDetail,
  PurchaseDebtSupplierGroup,
  PurchasesService
} from '../../core/service/purchases.service';


export interface PurchaseDebtDetailDialogData {
  debtAmount: number;
}

export type PurchaseDebtDetailDialogResult = 'GO_TO_DEBT' | null;

@Component({
  selector: 'app-purchase-debt-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './purchase-debt-detail-dialog.component.html',
  styleUrl: './purchase-debt-detail-dialog.component.scss'
})


export class PurchaseDebtDetailDialogComponent {





    
  private dialogRef = inject(
    MatDialogRef<PurchaseDebtDetailDialogComponent, PurchaseDebtDetailDialogResult>
  );

  private purchasesService = inject(PurchasesService);

  loading = true;
  detail: PurchaseDebtDetail | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PurchaseDebtDetailDialogData, private router: Router,
    
  ) {
    this.loadDebtDetail();
  }

  get debtAmount(): number {
    return Number(this.detail?.debtTotal ?? this.data?.debtAmount ?? 0);
  }

  get suppliers(): PurchaseDebtSupplierGroup[] {
    return this.detail?.suppliers || [];
  }

  get suppliersCount(): number {
    return this.detail?.suppliersCount || 0;
  }

  get documentsCount(): number {
    return this.detail?.documentsCount || 0;
  }

  private loadDebtDetail(): void {
    this.loading = true;

    this.purchasesService.getDebtDetail()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res) => {
          this.detail = res;
        },
        error: () => {
          this.detail = null;
        }
      });
  }

  close(): void {
    this.dialogRef.close(null);
  }

   goToDebt(): void {
    this.dialogRef.close('GO_TO_DEBT');
    this.router.navigate(['/compras/pagos']);
  }

  getVehicleDisplay(item: any): string {
    if (!item.vehicleName) return 'Sin vehículo';

    return item.vehiclePlate
      ? `${item.vehicleName} (${item.vehiclePlate})`
      : item.vehicleName;
  }
}