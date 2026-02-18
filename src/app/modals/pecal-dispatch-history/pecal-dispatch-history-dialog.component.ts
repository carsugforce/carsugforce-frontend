import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PecalService } from '../../core/service/pecal.service';
import { PecalOrderStatus } from '../../core/models/pecal-order-status';
import { OrderHistoryEvent } from '../../core/models/order-history-event.model';
import { AddMissingHistoryItem } from '../../core/models/dispatch-history.model';
import { Console } from 'console';

interface DispatchHistoryDialogData {
  orderId: number;
  orderNumber?: string;
  status: PecalOrderStatus;
}

@Component({
  standalone: true,
  selector: 'app-pecal-dispatch-history-dialog',
  imports: [CommonModule, MatDialogModule, MatIconModule],
  templateUrl: './pecal-dispatch-history-dialog.component.html',
  styleUrls: ['./pecal-dispatch-history-dialog.component.scss'],
})
export class PecalDispatchHistoryDialogComponent implements OnInit {

  history: OrderHistoryEvent[] = [];
  loading = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DispatchHistoryDialogData,
    private dialogRef: MatDialogRef<PecalDispatchHistoryDialogComponent>,
    private pecalService: PecalService
  ) {}

 itemsTotal = 0;
  // ============================
  // INIT
  // ============================
  ngOnInit(): void {
    this.loadHistory();
  }

  // ============================
  // LOAD
  // ============================
  loadHistory(): void {
    this.loading = true;

    this.pecalService.getOrderHistory(this.data.orderId).subscribe({
      next: (res) => {
        this.history = (res ?? []).map(e => this.normalizeEvent(e));
        this.loading = false;
      },
      error: () => {
        this.history = [];
        this.loading = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  // ============================
  // NORMALIZE BACKEND SHIT
  // ============================
  private normalizeEvent(e: any): OrderHistoryEvent {
  let payload: any = null;

  if (e.payload) {
    try {
      payload = typeof e.payload === 'string'
        ? JSON.parse(e.payload)
        : e.payload;
    } catch {
      payload = null;
    }
  }

  let items: any[] = [];
  
 
  if (e.type === 'ADD_MISSING') {
   if (e.type === 'ADD_MISSING') {
      const list =
        payload?.items ??
        payload?.added ??
        payload?.Added ??
        [];

      items = list.map((x: any) => ({
        productId: x.productId,
        qtyBefore: x.qtyBefore ?? 0,
        qtyAfter: x.qtyAfter ?? x.qtyBefore,
        qty: (x.qtyAfter ?? 0) - (x.qtyBefore ?? 0),
        productName: x.productName,
        unit: x.unit,
        observations: x.observations
      }));
    }
  }

  
  if (e.type === 'DISPATCH' && payload?.items) {
    items = payload.items;
  }

  if (e.type === 'RECEPTION' && payload) {
    items = (payload.items ?? []).map((x: any) => ({
      productId: x.ProductId ?? x.productId,
      productName: x.ProductName ?? x.productName,
      unit: x.Unit ?? x.unit,
      sentQty: x.SentQty ?? x.sentQty,
      receivedQty: x.ReceivedQty ?? x.receivedQty,
      missingQty: x.MissingQty ?? x.missingQty
    }));
  }

  return {
    type: e.type,
    startedAt: e.occurredAt ?? null,
    createdBy: e.user ?? '—',

    dispatchNumber:
      e.dispatchNumber ??
      payload?.dispatchNumber ??
      null,

    items,
    diff: this.parseDiff(payload),
    _open: false
  };

}




  getAddMissingItems(event: OrderHistoryEvent): number {
    if (event.type !== 'ADD_MISSING') return 0;
    return event.items?.length ?? 0;
  }




  private parseDiff(payload: any): OrderHistoryEvent['diff'] | undefined {
    if (!payload) return undefined;

    try {
      const diff = typeof payload === 'string'
        ? JSON.parse(payload)
        : payload;

      return {
        notesBefore: diff.notesBefore,
        notesAfter: diff.notesAfter,
        itemsAdded: diff.added ?? diff.itemsAdded ?? [],
        itemsRemoved: diff.removed ?? diff.itemsRemoved ?? [],
        itemsUpdated: diff.updated ?? diff.itemsUpdated ?? [],
      };
    } catch {
      return undefined;
    }
  }

  // ============================
  // UI HELPERS
  // ============================
  getOrderStatusLabel(status: PecalOrderStatus): string {
    switch (status) {
      case 'Open':
        return 'Por surtir';
      case 'Partial':
        return 'Surtida parcial';
      case 'Complete':
        return 'Completada';
      case 'Closed':
        return 'Cerrada';
      default:
        return '';
    }
  }

  normalizeDate(date?: string | null): string {
    if (!date) return '';
    return date.endsWith('Z') ? date : date + 'Z';
  }

  trackByEvent(_: number, e: OrderHistoryEvent) {
    return `${e.type}-${e.dispatchNumber ?? 'na'}-${e.startedAt}`;
  }

  getDispatchRoundLabel(n?: number): string {
    if (!n) return '';
    if (n === 1) return '1ª vuelta';
    if (n === 2) return '2ª vuelta';
    if (n === 3) return '3ª vuelta';
    return `${n}ª vuelta`;
  }

  getEventTitle(e: OrderHistoryEvent): string {
    switch (e.type) {
      case 'CREATED':
        return '📄 Pedido creado';
      case 'EDITED':
        return '✏️ Pedido editado';
      case 'ADD_MISSING':
       return '➕ Productos agregados por faltante';
      case 'DISPATCH':
        return `🚚 Despacho #${e.dispatchNumber}`;

      case 'RECEPTION':
        return `📦 Recepción despacho #${e.dispatchNumber}`;

      default:
        return '';
    }
  }

  toggle(event: any): void {
    event._expanded = !event._expanded;
  }


  hasQtyChange(i: any): boolean {
    return i.qtyBefore !== i.qtyAfter;
  }

  hasObservationChange(i: any): boolean {
    return (i.observationsBefore ?? '') !== (i.observationsAfter ?? '');
  }






}
