import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PecalService } from '../../core/service/pecal.service';
import { PendingDispatch } from '../../core/models/pending-dispatch.model';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

import {
  DispatchDetailResponse,
  DispatchProductDto
} from '../../core/models/dispatch-detail.model';

@Component({
  standalone: true,
  selector: 'app-receive-dispatch-list-dialog',
  templateUrl: './receive-dispatch-list-dialog.component.html',
  styleUrls: ['./receive-dispatch-list-dialog.component.scss'],
  imports: [CommonModule, MatProgressSpinner, MatIcon, FormsModule],
})
export class ReceiveDispatchListDialogComponent implements OnInit, OnDestroy {

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      orderId: number;
      orderNumber: string;
    },
    private dialogRef: MatDialogRef<ReceiveDispatchListDialogComponent>,
    private pecalService: PecalService
  ) {}

  view: 'list' | 'detail' = 'list';

  pendingDispatches: PendingDispatch[] = [];
  selectedDispatch: PendingDispatch | null = null;

  dispatchDetail: DispatchDetailResponse | null = null;

  loading = true;

  // ============================
  // INIT / DESTROY
  // ============================

  ngOnInit(): void {
    this.loadPending();

    window.addEventListener('popstate', this.onBack);
  }

  ngOnDestroy(): void {
    window.removeEventListener('popstate', this.onBack);
  }

  loadPending() {
    this.loading = true;

    this.pecalService.getPendingDispatches(this.data.orderId).subscribe({
      next: res => {
        this.pendingDispatches = res ?? [];
        this.loading = false;
      },
      error: () => {
        this.pendingDispatches = [];
        this.loading = false;
      }
    });
  }

  // ============================
  // NAV
  // ============================

  selectDispatch(d: PendingDispatch) {
    this.selectedDispatch = d;
    this.view = 'detail';

    //console.log('Selected dispatch:', d);

    this.loadDispatchDetail(d.id);

    history.pushState({ view: 'detail' }, '');
  }

  goBack() {
    this.view = 'list';
    this.selectedDispatch = null;
    this.dispatchDetail = null;
  }

  close() {
    
    this.dialogRef.close();
  }

  onBack = () => {
    if (this.view === 'detail') {
      this.goBack();
    } else {
      this.dialogRef.close();
    }
  };

  // ============================
  // HEADER
  // ============================

  get headerTitle(): string {
    return this.view === 'list'
      ? `Recepción de orden: ${this.data.orderNumber}`
      : `Surtido #${this.selectedDispatch?.dispatchNumber ?? ''}`;
  }

  normalizeDate(date: string | null | undefined): Date | undefined {
    if (!date) return undefined;
    return new Date(date.endsWith('Z') ? date : `${date}Z`);
  }


  // ============================
  // LOAD DETAIL
  // ============================

  loadDispatchDetail(dispatchId: number) {
    this.loading = true;

    this.pecalService.getDispatchDetail(dispatchId).subscribe({
      next: res => {
        this.dispatchDetail = res;
       // console.log('Dispatch detail loaded:', res);  
        // Inicializar UI (sin backend)
        res.families.forEach(f =>
          f.lines.forEach(l =>
            l.items.forEach(p => {
              p.sentqty = p.dispatchedQty;
              p.receivedQty = p.dispatchedQty;
              p._editing = false;
            })
          )
        );

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // ============================
  // QTY LOGIC
  // ============================

  onQtyChange(p: DispatchProductDto, qty: number) {

    const step = this.getStep(p);

    // Redondear al step correcto
    qty = Math.round(qty / step) * step;

    if (qty < 0) qty = 0;
    if (qty > p.sentqty) qty = p.sentqty;

    // 🔥 evitar problemas de 0.499999
    p.receivedQty = Number(qty.toFixed(2));
  }


  getDiffState(p: DispatchProductDto): 'ok' | 'missing' | 'extra' {
    if (p.receivedQty === p.sentqty) return 'ok';
    if (p.receivedQty < p.sentqty) return 'missing';
    return 'extra';
  }

  isQtyLocked(p: DispatchProductDto): boolean {
    return p.receivedQty === p.sentqty;
  }

  // ============================
  // CONFIRM RECEPTION
  // ============================

  confirmReception() {
  if (!this.selectedDispatch || !this.dispatchDetail) return;

  const items = this.dispatchDetail.families
    .flatMap(f => f.lines)
    .flatMap(l => l.items)
    .map(p => ({
      productId: p.productId,
      receivedQty: p.receivedQty ?? 0
    }));

  this.loading = true;

  // console.log('Confirming reception for dispatch ID:', this.selectedDispatch.id);
  // console.log('Items to confirm:', items);

    this.pecalService
      .confirmDispatchReception(this.selectedDispatch.id, { items })
      .subscribe({
        next: () => {
          this.loading = false;

          // volver a lista
          this.goBack();

          // refrescar pendientes (badge)
          this.loadPending();
        },
        error: () => {
          this.loading = false;
          console.error('Error confirmando recepción');
        }
      });
  }


  isCanalProduct(p: DispatchProductDto): boolean {
    return p.productDescription?.toLowerCase().includes('canal');
  }


   getStep(p: DispatchProductDto): number {
    return this.isCanalProduct(p) ? 0.5 : 1;
  }




}
