import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { PecalOrderDetail } from '../../core/models/pecal-order-detail';
import { PecalOrderStatus } from '../../core/models/pecal-order-status';
import { PecalService } from '../../core/service/pecal.service';
import { PecalOrderFamily, PecalOrderItemDetail } from '../../core/models/pecal-order-item-detail';
import { PecalOrderItem } from '../../core/models/pecal-orderItem';
import { PecalOrderDetailResponse } from '../../core/models/pecal-order-detail-response';
import { OrderPickingItem } from '../../core/models/order-picking-item.model';
import { Router } from '@angular/router';
import { ShowMissingProductsComponent } from './show-missing-products/show-missing-products.component';
import { SnackbarService } from '../../core/service/snackbar.service';

@Component({
  selector: 'app-pecal-order-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatIconModule
  ],
  templateUrl: './pecal-order-detail-dialog.component.html',
  styleUrls: ['./pecal-order-detail-dialog.component.scss'],
})
export class PecalOrderDetailDialogComponent implements OnInit {

  /** Datos generales del pedido (vienen del card) */
  order!: PecalOrderDetail;

  /** Items del pedido (se cargan por endpoint) */
  items: PecalOrderItemDetail[] = [];

  families: PecalOrderFamily[] = [];

  pickingItems: OrderPickingItem[] = [];

  loading = false;

  suc ? = ''
  /** Diccionario de estatus */
  statusDictionary: Record<PecalOrderStatus, string> = {
    Sent: 'Enviada',
    Open: 'Abierta',
    Partial: 'Surtida',
    Complete: 'Completa',
    Closed: 'Cerrada'
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PecalOrderDetail,
    private dialogRef: MatDialogRef<PecalOrderDetailDialogComponent>,
    private pecalService: PecalService,
     private dialog: MatDialog,
     private router: Router,
     private snackbar: SnackbarService,
  ) {}

  ngOnInit(): void {
    //  El pedido YA viene del card
    this.order = this.data;

    //  Solo consultamos los ITEMS
    this.loadItems();
  }

  startDispatching = 0;
   loadItems(): void {
    this.loading = true;
  
    this.pecalService.getOrderDetail(this.order.id).subscribe({
      next: (res: PecalOrderDetailResponse) => {
         this.suc = res.sucursalName
        this.families = res.families;


       // console.log(res)
      
        this.order.createdAt = res.createdAt;
        this.order.sentAt = res.sentAt;
        this.order.openAt = res.openAt;
        this.order.partialAt = res.partialAt;
        this.order.completeAt = res.completeAt;
        this.order.closedAt = res.closedAt;
        this.startDispatching = res.startDispatching;
        

        this.loading = false;
      },
      error: err => {
        this.loading = false;
        console.error(err);
      }
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
    return this.items.some(i => i.observations?.trim());

    
  }

   /* get groupedItems() {
      const groups: Record<string, PecalOrderItemDetail[]> = {};

      for (const item of this.items) {
        if (!groups[item.lineDescription]) {
          groups[item.lineDescription] = [];
        }
        groups[item.lineDescription].push(item);
      }

      return Object.entries(groups).map(([line, items]) => ({
        line,
        items
      }));
    }*/

  // =====================================================
  // ACTIONS (FUTURO)
  // =====================================================

  onReceiveOrder(): void {
    //console.log('Recibir pedido', this.order.id);
  }

  onCloseOrder(): void {
    //console.log('Cerrar pedido', this.order.id);
  }

  // =====================================================
  // MODAL CONTROL
  // =====================================================

  close(): void {
    this.dialogRef.close();
  }

  
  normalizeDate(date?: string | null): string {
    if (!date) return '';
    return date.endsWith('Z') ? date : date + 'Z';
  }

      
  editOrder() {
    this.pecalService.canEditOrder(this.order.id).subscribe({
    next: (res) => {

      if (!res.canEdit) {
        this.snackbar.warning('La orden ya fue tomada por almacén y no puede editarse');
        this.startDispatching = res.startDispatching;
        this.order.openAt = res.openAt;
        this.order.status = res.status as any;

        return;
      }

      this.router.navigate(['/pecal/edit', this.order.id]);
      this.close();
    },
    error: () => {
      this.snackbar.error('No se pudo validar el estado de la orden');
    }
  });
  }



    

    openPendingItems(): void {

      //console.log(this.order)
      const ref = this.dialog.open(ShowMissingProductsComponent, {
        width: '900px',
        panelClass: 'custom-dialog-panel',
        data: {
          orderId: this.order.id,
          pendingDispatch: this.order.pendingDispatchesCount
        }
      });

      ref.afterClosed().subscribe(result => {
        if (!result) return;

        if (result.action === 'go-to-edit') {

          this.dialogRef.close();

        
          this.router.navigate(
            ['/pecal/edit', this.order.id],
            {
              state: {
                mode: 'add-missing',
                orderNumber: this.order.orderNumber,
                items: result.payload,
                
              }
            }
          );
        }
      });
    }



    addItems() {
      
      this.router.navigate(['/pecal/add-items', this.order.id]);
      this.close();
    }



    

  
}
