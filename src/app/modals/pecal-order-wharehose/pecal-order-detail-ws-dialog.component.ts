import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { PecalOrderDetail } from '../../core/models/pecal-order-detail';
import { PecalOrderStatus } from '../../core/models/pecal-order-status';
import { PecalService } from '../../core/service/pecal.service';
import {
  PecalOrderFamily,
  PecalOrderItemDetail,
} from '../../core/models/pecal-order-item-detail';
import { PecalOrderItem } from '../../core/models/pecal-orderItem';
import { PecalOrderDetailResponse } from '../../core/models/pecal-order-detail-response';

import * as htmlToImage from 'html-to-image';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { OrderPickingItem } from '../../core/models/order-picking-item.model';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ConfirmDispatchSummaryComponent } from './confirmdialog-summary/confirm-dispatch-summary.component';
import { SnackbarService } from '../../core/service/snackbar.service';

@Component({
  selector: 'app-pecal-order-detail-ws-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatIconModule,
    MatDialogModule,
    MatSlideToggleModule,
  ],
  templateUrl: './pecal-order-detail-ws-dialog.component.html',
  styleUrls: ['./pecal-order-detail-ws-dialog.component.scss'],
})
export class PecalOrderDetailWsDialogComponent implements OnInit {
  @ViewChildren('familyDiv') familyDivs!: QueryList<ElementRef>;

  /** Datos generales del pedido (vienen del card) */
  order!: PecalOrderDetail;

  /** Items del pedido (se cargan por endpoint) */
  items: PecalOrderItemDetail[] = [];

  families: PecalOrderFamily[] = [];
  pickingItems: OrderPickingItem[] = [];

  suc? = '';

  loading = false;
  hideComplete = true;
  showBtnProductDetail = false;
  isDispatchMode = true;

  dispatchQty: Record<number, number> = {};
  editingQty: Record<number, boolean> = {};

  /**  Estado blindado para no depender de isOutOfStock vs IsOutOfStock */
  outOfStockMap: Record<number, boolean> = {};

  /** Diccionario de estatus */
  statusDictionary: Record<PecalOrderStatus, string> = {
    Sent: 'Enviada',
    Open: 'Abierta',
    Complete: 'Completa',
    Partial: 'Surtida',
    Closed: 'Cerrada',
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PecalOrderDetail,
    private dialogRef: MatDialogRef<PecalOrderDetailWsDialogComponent>,
    private dialog: MatDialog,
    private pecalService: PecalService,
    private snackbar: SnackbarService,
  ) {}

  startDispatching = 0;

  ngOnInit(): void {
    this.order = this.data;

    this.loadItems();
    this.loadPickingItems();
  }

  loadItems(): void {
    this.loading = true;

    this.pecalService.getOrderDetail(this.order.id).subscribe({
      next: (res: PecalOrderDetailResponse) => {
        //console.log('RES ORDER DETAIL:', res);
        this.suc = res.sucursalName;
        this.families = res.families;

        this.order.createdAt = res.createdAt;
        this.order.sentAt = res.sentAt;
        this.order.openAt = res.openAt;
        this.order.partialAt = res.partialAt;
        this.order.completeAt = res.completeAt;
        this.order.closedAt = res.closedAt;

        this.startDispatching = res.startDispatching;
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
      },
    });
  }

  // =====================================================
  // HELPERS UI
  // =====================================================

  get statusLabel(): string {
    return this.statusDictionary[this.order.status];
  }

  get canCloseOrder(): boolean {
    return this.order.status === 'Complete' || this.order.status === 'Partial';
  }

  get canReceiveOrder(): boolean {
    return this.order.status === 'Partial';
  }

  get hasObservations(): boolean {
    return this.items.some((i) => i.observations?.trim());
  }

  onReceiveOrder(): void {
    console.log('Recibir pedido', this.order.id);
  }

  onCloseOrder(): void {
    console.log('Cerrar pedido', this.order.id);
  }

  // =====================================================
  // DISPATCH / COMPLETE
  // =====================================================

  /* onDispatch(action: 'Dispatch' | 'Complete'): void {
    //  Dispatch: abre SOLO 1 modal resumen final
    if (action === 'Dispatch') {
      this.confirmFinalDispatch();
      return;
    }

    //  Complete: se queda EXACTO como estaba (payload normal)
    this.showBtnProductDetail = false;
    const payload = this.getDispatchPayload(action);
    if (!payload.length) return;

    const confirmConfig = this.getConfirmConfig(action);

    if (!confirmConfig) {
      this.closeWithPayload(action, payload);
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: confirmConfig.width ?? '380px',
      data: confirmConfig.data,
    });

    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.closeWithPayload(action, payload);
    });
  }*/

  onDispatch(action: 'Dispatch' | 'Complete'): void {
    if (action === 'Complete') {
      this.showBtnProductDetail = false;
    }
    //if (action === 'Dispatch') { this.resetComponetsDetails()}
    this.confirmFinalDispatch(action);
  }

  getConfirmConfig(action: 'Dispatch' | 'Complete'): {
    width?: string;
    data: {
      type: 'warning';
      title: string;
      message: string;
      showCancel: boolean;
      cancelText: string;
      confirmText: string;
    };
  } | null {
    if (action === 'Complete') {
      return {
        width: '400px',
        data: {
          type: 'warning',
          title: 'Confirmar orden completa',
          message:
            'Esta acción marcará la orden como COMPLETA. ¿Deseas continuar?',
          showCancel: true,
          cancelText: 'Cancelar',
          confirmText: 'Sí, completar orden',
        },
      };
    }
    return null;
  }

  closeWithPayload(action: 'Dispatch' | 'Complete', payload: any[]) {
    this.dialogRef.close({
      action,
      orderId: this.order.id,
      items: payload,
    });
  }

  /**  Cierre para dispatch final: manda TODO (dispatch + outOfStock) */
  closeWithFinalDispatch(summary: any) {
    const payload = {
      dispatchItems: summary.dispatch.map((d: any) => ({
        productId: d.productId,
        qty: d.qty,
      })),
      outOfStockItems: summary.outOfStock.map((o: any) => ({
        productId: o.productId,
        qty: o.qty,
      })),
    };

    this.dialogRef.close({
      action: 'Dispatch',
      orderId: this.order.id,
      payload,
    });
  }

  resetComponetsDetails(): void {
    this.outOfStockMap = {};
    this.dispatchQty = {};

    this.pickingItems.forEach(pi => {
      this.outOfStockMap[pi.productId] = false;
      this.dispatchQty[pi.productId] = pi.pendingOperationalQty ?? 0;
    });

    this.showBtnProductDetail = false;
  }


  close(): void {
    this.dialogRef.close();
  }

  normalizeDate(date: string) {
    return new Date(date + 'Z');
  }

  // ============================
  //  BLINDAJE DESABASTO
  // ============================

  readIsOutOfStock(pi: any): boolean {
    return !!(pi?.isOutOfStock ?? pi?.IsOutOfStock);
  }

  writeIsOutOfStock(pi: any, value: boolean): void {
    if (!pi) return;
    pi.isOutOfStock = value;
    pi.IsOutOfStock = value;
  }

  // =====================================================
  // EXPORT WHATSAPP
  // =====================================================

  async exportFamily(familyName: string) {
    const now = new Date();

    const formattedDate = now.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

    const formattedTime = now.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const div = this.familyDivs
      .toArray()
      .find((d) => d.nativeElement.dataset.family === familyName);

    if (!div) return;

    const node = div.nativeElement.cloneNode(true) as HTMLElement;

    // ============================
    // HEADER EXTRA PARA EXPORT
    // ============================
    const meta = document.createElement('div');
    meta.className = 'export-meta';

    meta.innerHTML = `
        <div class="export-meta-content" style="margin-left: 12px;">
          <strong>Orden:</strong> ${this.order.orderNumber}<br />
          <strong>Fecha: </strong> ${formattedDate}, enviado a las: ${formattedTime}<span style="font-size:10px"> ✔️✔️</span>
        </div>
      `;

    // lo insertamos arriba del contenido de la familia
    node.prepend(meta);

    node.classList.add('export-image');
    node.classList.add('exporting');
    node.classList.add('export-whatsapp');
    document.body.appendChild(node);

    await new Promise((r) => setTimeout(r, 100));

    try {
      const blob = await htmlToImage.toBlob(node, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });

      if (!blob) throw new Error('No se pudo generar imagen');

      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `familia-${familyName}-${this.order.orderNumber}.png`;
      link.click();

      URL.revokeObjectURL(url);
    } finally {
      document.body.removeChild(node);
    }

    const phone = '';

    const message = encodeURIComponent(
      `PECAL ID: ${this.order.orderNumber}\n` +
        `Familia: ${familyName}\n` +
        `Fecha - hora: ${formattedDate} - ${formattedTime}\n` +
        `Adjunto imagen para su despacho`,
    );

    const wsUrl = this.isMobile()
      ? `https://wa.me/${phone}?text=${message}`
      : `https://web.whatsapp.com/send?text=${message}`;

    window.open(wsUrl, '_blank');
  }

  isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent,
    );
  }

  // =====================================================
  // QTY
  // =====================================================

  getQty(productId: number): number {
    // if (this.isPersistedOutOfStock(productId)) {
    //   return 0;
    // }

    return this.dispatchQty[productId] ?? 0;
  }

  setQty(productId: number, max: number, value: number) {
    const safe = Math.max(0, Math.min(value, max));
    this.dispatchQty[productId] = safe;
  }

  startEdit(productId: number) {
    this.editingQty[productId] = true;
  }

  stopEdit(productId: number) {
    this.editingQty[productId] = false;
  }

  getItemKey(item: PecalOrderItemDetail): number {
    return item.productId;
  }

  showBtnProductDetailM() {
    if (this.startDispatching === 0) {
      this.confirmStartDispatch();
    } else {
      this.showBtnProductDetail = true;
      this.dispatchQty = {};
      this.loadInputsDispatch();
    }
  }

  confirmStartDispatch() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        type: 'warning',
        title: 'Iniciar surtido',
        message: '¿Deseas iniciar el surtido de esta orden?',
        showCancel: true,
        cancelText: 'Cancelar',
      },
    });

    dialogRef.afterClosed().subscribe((confirm) => {
      if (!confirm) return;

      // 👉 backend
      this.pecalService.startDispatchFlag(this.order.id).subscribe({
        next: () => {
          this.snackbar.success('Surtido iniciado');
          this.startDispatching = 1;
          this.showBtnProductDetail = true;
          this.dispatchQty = {};
          this.loadInputsDispatch();
        },
        error: () => {
          this.snackbar.error('No se pudo iniciar el surtido');
        },
      });
    });
  }

  /*loadInputsDispatch(){
    console.log(this.pickingItems)
     this.pickingItems.forEach((pi: any) => {
        if ((pi.pendingQty ?? 0) > 0) {
          this.dispatchQty[pi.productId] = pi.pendingQty;
        } else {
          this.dispatchQty[pi.productId] = 0;
        }
      });
  }*/

 loadInputsDispatch() {
    this.dispatchQty = {};
    this.pickingItems.forEach(pi => {
      this.dispatchQty[pi.productId] = pi.pendingOperationalQty ?? 0;
    });
  }


  onQtyInput(productId: number, event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    this.dispatchQty[productId] = isNaN(value) ? 0 : value;
  }

  onQtyBlur(productId: number) {
    const max = this.getPendingToDispatch(productId);
    const step = this.getStep(productId);
    let value = this.dispatchQty[productId] ?? 0;

    const factor = 1 / step;
    value = Math.round(value * factor) / factor;

    if (value < 0) value = 0;
    if (value > max) value = max;

    this.dispatchQty[productId] = value;
  }



  trackByItem(index: number, item: PecalOrderItemDetail): number {
    return item.productId;
  }

  forceBlur(event: Event, productId: number) {
    const input = event.target as HTMLInputElement;
    input.blur();
  }

 

  get totalDispatched(): number {
    return this.pickingItems.reduce(
      (acc, i) => acc + (i.sentOperationalQty ?? 0),
      0
    );
  }

  get totalPending(): number {
    return this.pickingItems.reduce(
      (acc, i) => acc + (i.pendingOperationalQty ?? 0),
      0
    );
  }

  // =====================================================
  // PICKING ITEMS (CLAVE)
  // =====================================================

  loadPickingItems(): void {
    this.pecalService.getPickingItems(this.order.id).subscribe((items) => {
      this.pickingItems = items ?? [];
      //console.log(this.pickingItems);
      //  reconstruir mapa desde API
      this.outOfStockMap = {};
      this.pickingItems.forEach((pi: any) => {
        const isOOS = this.readIsOutOfStock(pi);
        this.outOfStockMap[pi.productId] = isOOS;
      });
    });
  }

  // =====================================================
  // DESABASTO (SWITCH UI)
  // =====================================================

  //  este es el que tu HTML necesita
  toggleOutOfStock(productId: number) {
    this.outOfStockMap[productId] = !this.outOfStockMap[productId];
  }

  //  por si lo usas en otro lado
  isOutOfStock(productId: number): boolean {
    return !!this.outOfStockMap[productId];
  }

  // =====================================================
  // DISPATCH PAYLOAD (Complete / legacy)
  // =====================================================

  getDispatchPayload(action: 'Dispatch' | 'Complete') {
    const payload: { productId: number; qty: number }[] = [];

    this.families.forEach((f) =>
      f.lines.forEach((l) =>
        l.items.forEach((item) => {
          const qty =
            action === 'Complete' ? item.qty : this.getQty(item.productId);

          if (qty > 0) {
            payload.push({
              productId: item.productId,
              qty,
            });
          }
        }),
      ),
    );

    return payload;
  }

  get showDispatchButton(): boolean {
    return this.order.status === 'Open' || this.order.status === 'Partial';
  }

  get showCompleteButton(): boolean {
    return this.order.status === 'Open';
  }

  hasDispatchForItem(productId: number): boolean {
    return this.getQty(productId) > 0;
  }

  // =====================================================
  //  FINAL (1 modal resumen)
  // =====================================================

  confirmFinalDispatch(action: 'Dispatch' | 'Complete') {
    if (action === 'Complete') {
      this.showBtnProductDetail = false;

      this.pickingItems.forEach((pi) => {
        if (this.isPersistedOutOfStock(pi.productId)) {
          this.setQty(pi.productId, pi.requestedQty, 0);
          return;
        }

        if (!this.outOfStockMap[pi.productId]) {
          // Completar = no enviar nada más
          this.setQty(pi.productId, pi.requestedQty, 0);
        } else {
          // desabasto → lo pendiente OPERATIVO
          this.setQty(
            pi.productId,
            pi.requestedQty,
            pi.pendingOperationalQty ?? 0
          );
        }
      });
    }

    const summary = this.buildDispatchSummary(action);

    const hasSomething = summary.some(
      (i) => i.enviado > 0 || i.desabasto !== null,
    );

    if (!hasSomething) return;

    const ref = this.dialog.open(ConfirmDispatchSummaryComponent, {
      width: '900px',
      panelClass: 'custom-dialog-panel',
      data: {
        action,
        summary,
        pickingItems: this.pickingItems,
      },
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;

      //console.log('FINAL DISPATCH RESULT:', result);
      this.dialogRef.close({
        action,
        orderId: this.order.id,
        payload: result.payload,
      });
    });
  }

  buildDispatchSummary(action: 'Dispatch' | 'Complete') {
    const pickingMap = new Map<number, any>(
      this.pickingItems.map((pi) => [Number(pi.productId), pi]),
    );

    const summary: any[] = [];

    this.families.forEach((family) => {
      family.lines.forEach((line) => {
        line.items.forEach((item) => {
          const pid = Number(item.productId);

          const pi = pickingMap.get(pid);
          if (!pi) return;

          const solicitado = pi.requestedQty ?? 0;

          // ✅ base operacional REAL para almacén
          const pendienteOperacional = this.getPendingToDispatch(pid);

          const marcadoDesabasto = !!this.outOfStockMap[pid];
          const isHistoricOut = this.isPersistedOutOfStock(pid);

          // defaults
          let enviado = 0;
          let pendiente = pendienteOperacional;
          let desabasto: number | null = null;

          if (isHistoricOut) {
            enviado = 0;
            pendiente = 0;
            desabasto = pendienteOperacional; // o 0, según tu lógica de “ya no usamos rojo”
          } else if (action === 'Complete') {
            // Complete = cerrar con desabasto si aplica
            enviado = solicitado;
            pendiente = 0;
            desabasto = marcadoDesabasto ? pendienteOperacional : null;
          } else {
            // Dispatch normal
            enviado = this.getQty(pid) ?? 0;
            // pendiente OPERACIONAL (no uses confirmed aquí)
            pendiente = Math.max(0, this.getPendingToDispatch(pid) - enviado);
            desabasto = marcadoDesabasto ? pendiente : null;
          }

          summary.push({
            family: family.family,
            line: line.line,
            productId: pid,
            producto: item.productDescription,
            solicitado,
            enviado,
            pendiente,
            desabasto,
          });
        });
      });
    });

    return summary;
  }

  sendFinalDispatch(summary: any) {
    this.closeWithFinalDispatch(summary);
  }

  isPersistedOutOfStock(productId: number): boolean {
    const pi = this.getPickingItem(productId);
    return !!pi?.isOutOfStock;
    //return !!pi?.isOutOfStock && (pi.pendingQty ?? 0) > 0;
  }

  isTempOutOfStock(productId: number): boolean {
    return !!this.outOfStockMap[productId];
  }

  /**
   * Operacional = lo confirmado + lo enviado después (si existe)
   * En la práctica: si ya despachaste más que lo confirmado, mandas sobre dispatched
   */

  /**
   * Lo que aún puedes enviar según operación (tu flujo)
   */

  // ====== GETTERS OPERACIONALES (ALMACÉN) ======

  getPickingItem(productId: number) {
    return this.pickingItems.find(p => p.productId === productId);
  }

  // lo que almacén ya mandó
  getSent(productId: number): number {
    return this.getPickingItem(productId)?.sentOperationalQty ?? 0;
  }

  //  lo que almacén TODAVÍA puede / debe mandar
  getPendingToDispatch(productId: number): number {
    return this.getPickingItem(productId)?.pendingOperationalQty ?? 0;
  }

  // lo que sucursal ha confirmado (solo informativo)
  getConfirmed(productId: number): number {
    return this.getPickingItem(productId)?.confirmedQty ?? 0;
  }

  // si recepción detectó faltantes
  hasConfirmedMissing(productId: number): boolean {
    return !!this.getPickingItem(productId)?.hasConfirmedMissing;
  }

  adjustQty(productId: number, delta: number) {
    const max = this.getPendingToDispatch(productId);
    const step = this.getStep(productId);
    const current = this.dispatchQty[productId] ?? 0;

    let next = current + delta;

    // 🔒 redondeo según step (0.5 o 1)
    const factor = 1 / step;
    next = Math.round(next * factor) / factor;

    if (next < 0) next = 0;
    if (next > max) next = max;

    this.dispatchQty[productId] = next;
  }



  getStep(productId: number): number {
    const pi = this.getPickingItem(productId);
    const name =
      pi?.productDescription ??
     // pi?.productName ??
      '';

    return name.toLowerCase().includes('canal') ? 0.5 : 1;
  }





}
