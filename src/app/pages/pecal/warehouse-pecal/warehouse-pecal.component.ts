import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { PecalOrderList } from '../../../core/models/pecal-order-list.model';
import { PecalService } from '../../../core/service/pecal.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PecalOrderDetailWsDialogComponent } from '../../../modals/pecal-order-wharehose/pecal-order-detail-ws-dialog.component';
import { PecalOrderStatus } from '../../../core/models/pecal-order-status';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, of } from 'rxjs';
import { catchError, finalize, switchMap, tap ,map} from 'rxjs/operators';
import { SnackbarService } from '../../../core/service/snackbar.service';
import { PecalDispatchHistoryDialogComponent } from '../../../modals/pecal-dispatch-history/pecal-dispatch-history-dialog.component';
import { UserService } from '../../../core/service/user.service';
import { Console } from 'console';



type OrderTab = 'open' | 'complete' | 'partial' | 'closed';

@Component({
  standalone: true,
  selector: 'app-pecal-warehouse',
  templateUrl: './warehouse-pecal.component.html',
  styleUrls: ['./warehouse-pecal.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule
  ],
})
export class WharehousePecal {
  constructor(
    private pecalService: PecalService,
    private dialog: MatDialog,
    private snackbar: SnackbarService,
    private userService: UserService
  ) {}

  readonly ORDER_STATUS_MAP: Record<
    string,
    {
      label: string;
      color: string;
    }
  > = {
    Sent: {
      label: 'Enviada',
      color: 'sent',
    },
    Open: {
      label: 'Abierta',
      color: 'open',
    },
    Complete: {
      label: 'Completada',
      color: 'complete',
    },
    Partial: {
      label: 'Surtida',
      color: 'partial',
    },
    Closed: {
      label: 'Cerrada',
      color: 'closed',
    },
  };
  permissions: string[] = [];
  orders: PecalOrderList[] = [];
  selectedTab: OrderTab = 'open';
  isDispatching = false;


  ngOnInit(): void {
     this.userService.getMe().subscribe((me: any) => {
        this.permissions = me.permissions ?? [];
      });
    
     this.loadOrders();
  }

 

  

  tabs: { key: OrderTab; label: string }[] = [
    { key: 'open', label: 'Abiertas' },
    { key: 'partial', label: 'Surtidas' },
    { key: 'complete', label: 'Completas' },
    { key: 'closed', label: 'Cerradas' },
  ];

  get filteredOrders() {
    return this.orders.filter((o) => {
      if (this.selectedTab === 'open') {
        return o.status === 'Sent' || o.status === 'Open';
      }
      return o.status.toLowerCase() === this.selectedTab;
    });
  }

  trackById(_: number, o: PecalOrderList) {
    return o.id;
  }

  getStatusLabel(status: string): string {
    return this.ORDER_STATUS_MAP[status]?.label ?? status;
  }

  getStatusLabelBtn(status: string): string {
    if (status === 'Sent') return 'Abrir Orden';
    else return 'Ver detalle';
  }

  getStatusClass(status: string): string {
    return this.ORDER_STATUS_MAP[status]?.color ?? '';
  }

  normalizeDate(date?: string | null): string {
    if (!date) {
      return '';
    }

    if (date.endsWith('Z')) {
      return date;
    }

    return date + 'Z';
  }


  /*openDetail(order: PecalOrderList) {
    if(order.status === 'Sent' ){
      this.pecalService.updateOrderStatus(order.id, 'Open').subscribe({
        next: res => {
         
        },
        error: (err: HttpErrorResponse) => {
          this.showError(err);
        }
      });
    }

    const dialogRef = this.dialog.open(PecalOrderDetailWsDialogComponent, {
      data: order,
      hasBackdrop: true,
      panelClass: 'order-detail-dialog',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result.action === 'Complete') { 
        this.changeStatus(result.orderId, result.action);
      }

      if (result.action === 'Partial') { 
        this.changeStatus(result.orderId, result.action);
      }

        
    });
    this.loadItems();
    

  }*/

  openDetail(order: PecalOrderList) {
    if (order.status === 'Sent') {
      this.pecalService.updateOrderStatus(order.id, 'Open').subscribe({
        next: () => {
          order.status = 'Open';
          order.openAt = new Date().toISOString();

          this.openDetailDialog(order);
        },
        error: (err: HttpErrorResponse) => {
          this.showError(err);
        },
      });
    } else {

       //console.log('Inicio el despacho?:', this.orders.find(o => o.id === order.id)?.startDispatch);
       if(order.status === 'Open' && this.orders.find(o => o.id === order.id)?.startDispatch === 0 ) {
        this.pecalService.updateOrderStatus(order.id, 'Open').subscribe({
          next: () => {
            order.status = 'Open';
          },
          error: (err: HttpErrorResponse) => {
            this.showError(err);
          },
        });
          this.openDetailDialog(order);
      } else {
         this.openDetailDialog(order);
         //this.snackbar.info('La orden no se puede modificar en su estado actual.');
      }
    }
  }

  openDetailDialog(order: PecalOrderList) {

    
    const dialogRef = this.dialog.open(PecalOrderDetailWsDialogComponent, {
      data: order,
      hasBackdrop: true,
      panelClass: 'order-detail-dialog',
      disableClose: this.isDispatching
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      // Anti doble submit
      if (this.isDispatching) return;

      const { action, orderId, payload } = result as {
        action: 'Dispatch' | 'Complete';
        orderId: number;
        payload: {
          dispatchItems: { productId: number; qty: number }[];
          outOfStockItems: { productId: number; qty: number }[];
        };
      };

      const dispatchItems = payload?.dispatchItems ?? [];
      const outOfStockItems = payload?.outOfStockItems ?? [];

      //console.log(dispatchItems)
      //console.log(outOfStockItems)

      if (!dispatchItems.length && !outOfStockItems.length) {
        this.snackbar.warning('No hay productos para procesar');
        return;
      }


      this.isDispatching = true;
      this.pecalService.startDispatch(orderId).pipe(

        //  Traer pendientes reales
        switchMap(({ dispatchId }) =>
          this.pecalService.getPickingItems(orderId).pipe(
            map(picking => ({ dispatchId, picking }))
          )
        ),

        // Ajustar SOLO dispatchItems contra pendientes
        switchMap(({ dispatchId, picking }) => {
         const pendingMap = new Map<number, number>(
            picking
              .filter(p => !p.isOutOfStock) // 🔥 regla CLAVE
              .map(p => [p.productId, p.pendingOperationalQty])
          );



          const adjustedItems = dispatchItems
            .filter(it => pendingMap.has(it.productId)) // 🔥 si está en desabasto, no pasa
            .map(it => {
              const pending = pendingMap.get(it.productId) ?? 0;
              const qty = Math.min(it.qty, pending);
              return { ...it, qty };
            })
            .filter(it => it.qty > 0);


          const hasDispatch = adjustedItems.length > 0;
          const hasOutOfStock = outOfStockItems.length > 0;

          //console.log('ADJUSTED ITEMS:', adjustedItems);
          //console.log('OUT OF STOCK ITEMS:', outOfStockItems);

          //  CASO 0: COMPLETE explícito (NO SE TOCA)
          if (!hasDispatch && action === 'Complete') {
            return this.pecalService.closeDispatch(dispatchId);
          }

          //  CASO 1: SOLO DESABASTO
          if (!hasDispatch && hasOutOfStock) {
            return this.pecalService
              .markItemOutOfStock(dispatchId, outOfStockItems)
              .pipe(
                switchMap(() => this.pecalService.closeDispatch(dispatchId)),
                map(() => dispatchId)
              );
          }

          // CASO 2: NADA QUE HACER
          if (!hasDispatch && !hasOutOfStock) {
            this.snackbar.warning(' No se detectó ningún cambio por registrar');
            return EMPTY;
          }

          //  CASO 3: HAY DESPACHO (con o sin desabasto)
          return this.pecalService.saveDispatchItems(dispatchId, adjustedItems).pipe(

            switchMap(() => {
              if (!hasOutOfStock) return of(null);
              return this.pecalService.markItemOutOfStock(dispatchId, outOfStockItems);
            }),

            switchMap(() => this.pecalService.closeDispatch(dispatchId)),
            map(() => dispatchId)
          );
        }),


       
        //  Refrescar órdenes
        switchMap(() => this.pecalService.getOrdersForWarehouse()),

        tap(orders => {
          this.orders = orders;

          const updated = orders.find(o => o.id === orderId);

          if (updated?.status === 'Complete') {
            this.snackbar.success(' Orden completada correctamente');
          } else {
            this.snackbar.success(' Surtido guardado correctamente 📦');
          }
        }),

        catchError(err => {
          console.error(err);
          this.snackbar.error(err?.error ?? 'Error al procesar el despacho');
          return EMPTY;
        }),

        finalize(() => {
          this.isDispatching = false;
        })

      ).subscribe();
      
    });
      
  }





  changeStatus(orderId: number, status: PecalOrderStatus) {
    this.pecalService.updateOrderStatus(orderId, status).subscribe({
      next: () => {
       
       this.loadOrders();
      },
      error: (err: HttpErrorResponse) => {
        this.showError(err);
      },
    });
  }

  orderId(orderId: any, status: string) {
    throw new Error('Method not implemented.');
  }

  loadOrders() {
    this.pecalService.getOrdersForWarehouse().subscribe(res => {
      this.orders = res;
      //console.log('Órdenes cargadas:', this.orders);
      
    });
  }

  


  showError(err: any) {
    throw new Error('Method not implemented.');
  }

  openDispatchHistory(order: PecalOrderList) {
    this.dialog.open(PecalDispatchHistoryDialogComponent, {
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
         status: order.status
      },
      panelClass: 'dispatch-history-dialog',
      width: '600px'
    });
  }


  


  hasPermission(permission: string): boolean {

    return this.permissions.includes(permission);
  }


  


  
}
