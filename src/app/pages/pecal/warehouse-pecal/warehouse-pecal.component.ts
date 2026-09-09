import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { PecalOrderList } from '../../../core/models/pecal-order-list.model';
import { PecalOrderFilters, PecalService } from '../../../core/service/pecal.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PecalOrderDetailWsDialogComponent } from '../../../modals/pecal-order-wharehose/pecal-order-detail-ws-dialog.component';
import { PecalOrderStatus } from '../../../core/models/pecal-order-status';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, of } from 'rxjs';
import { catchError, debounceTime, finalize, switchMap, tap ,map} from 'rxjs/operators';
import { SnackbarService } from '../../../core/service/snackbar.service';
import { PecalDispatchHistoryDialogComponent } from '../../../modals/pecal-dispatch-history/pecal-dispatch-history-dialog.component';
import { UserService } from '../../../core/service/user.service';



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
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule
  ],
  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-MX',
    },
  ],
})
export class WharehousePecal implements OnInit {
  constructor(
    private pecalService: PecalService,
    private dialog: MatDialog,
    private snackbar: SnackbarService,
    private userService: UserService
  ) {}

  private fb = inject(FormBuilder);

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
  isLoading = false;
  readonly pageSize = 15;

  filtersForm = this.fb.group({
    search: [''],
    dateFrom: [null as Date | null],
    dateTo: [null as Date | null],
  });


  ngOnInit(): void {
     this.userService.getMe().subscribe((me: any) => {
        this.permissions = me.permissions ?? [];
      });

     this.loadOrders();

     this.filtersForm.valueChanges
      .pipe(debounceTime(250))
      .subscribe(() => {
        this.loadOrders();
      });
  }

 

  

  tabs: { key: OrderTab; label: string; icon: string }[] = [
    { key: 'open', label: 'Abiertas', icon: 'pending_actions' },
    { key: 'partial', label: 'Surtidas', icon: 'inventory' },
    { key: 'complete', label: 'Completas', icon: 'task_alt' },
    { key: 'closed', label: 'Cerradas', icon: 'lock' },
  ];

  get filteredOrders() {
    return this.orders.filter((o) => {
      if (this.selectedTab === 'open') {
        return o.status === 'Sent' || o.status === 'Open';
      }
      return o.status.toLowerCase() === this.selectedTab;
    });
  }

  clearFilters(): void {
    this.selectedTab = 'open';
    this.filtersForm.reset(
      {
        search: '',
        dateFrom: null,
        dateTo: null,
      },
      {
        emitEvent: false,
      },
    );
    this.loadOrders();
  }

  onTabChange(tab: OrderTab): void {
    this.selectedTab = tab;
    this.loadOrders();
  }

  private buildFilters(): PecalOrderFilters {
    const raw = this.filtersForm.getRawValue();

    return {
      orderNumber: this.clean(raw.search),
      dateFrom: this.toApiDate(raw.dateFrom),
      dateTo: this.toApiDate(raw.dateTo),
      status: this.getSelectedStatusFilter(),
      pageSize: this.pageSize,
    };
  }

  private getSelectedStatusFilter(): string {
    const statusByTab: Record<OrderTab, string> = {
      open: 'Sent,Open',
      partial: 'Partial',
      complete: 'Complete',
      closed: 'Closed',
    };

    return statusByTab[this.selectedTab];
  }

  private applyLocalFilters(orders: PecalOrderList[]): PecalOrderList[] {
    const raw = this.filtersForm.getRawValue();
    const orderNumber = this.clean(raw.search)?.toLowerCase() ?? '';
    const dateFrom = raw.dateFrom ? new Date(this.toApiDate(raw.dateFrom)! + 'T00:00:00') : null;
    const dateTo = raw.dateTo ? new Date(this.toApiDate(raw.dateTo)! + 'T23:59:59') : null;

    return orders.filter((order) => {
      const matchesOrderNumber = !orderNumber || order.orderNumber.toLowerCase().includes(orderNumber);
      const createdAt = new Date(this.normalizeDate(order.createdAt));
      const matchesDateFrom = !dateFrom || createdAt >= dateFrom;
      const matchesDateTo = !dateTo || createdAt <= dateTo;

      return matchesOrderNumber && matchesDateFrom && matchesDateTo;
    }).sort((a, b) => {
      return new Date(this.normalizeDate(b.createdAt)).getTime() - new Date(this.normalizeDate(a.createdAt)).getTime();
    }).slice(0, this.pageSize);
  }

  get hasFilters(): boolean {
    const raw = this.filtersForm.getRawValue();

    return !!(
      this.clean(raw.search) ||
      raw.dateFrom ||
      raw.dateTo ||
      this.selectedTab !== 'open'
    );
  }

  private clean(value: unknown): string | undefined {
    const parsed = String(value ?? '').trim();
    return parsed || undefined;
  }

  private toApiDate(value: Date | null | undefined): string | undefined {
    if (!value) return undefined;

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
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
      disableClose: true,
      autoFocus: false,
      restoreFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      if (this.isDispatching) return;

      const { action, orderId, payload, notes } = result as {
        action: 'Dispatch' | 'Complete';
        orderId: number;
        payload: {
          dispatchItems: { productId: number; qty: number }[];
          outOfStockItems: { productId: number; qty: number }[];
        };
        notes: string;
      };

      const dispatchItems = payload?.dispatchItems ?? [];
      const outOfStockItems = payload?.outOfStockItems ?? [];

      if (!dispatchItems.length && !outOfStockItems.length) {
        this.snackbar.warning('No hay productos para procesar');
        return;
      }

      this.isDispatching = true;

      const cleanNote = notes?.trim() ?? '';
      const currentOrder = this.orders.find(o => o.id === orderId);
      const originalNote = currentOrder?.notes?.trim() ?? '';

      const noteChanged = cleanNote !== originalNote;

      const noteUpdate$ = noteChanged
        ? this.pecalService.updateOrderNotes(orderId, cleanNote)
        : of(true);

      noteUpdate$.pipe(
        switchMap(() => this.pecalService.startDispatch(orderId)),
        switchMap(({ dispatchId }) =>
          this.pecalService.getPickingItems(orderId).pipe(
            map(picking => ({ dispatchId, picking }))
          )
        ),
        switchMap(({ dispatchId, picking }) => {
          const pendingMap = new Map<number, number>(
            picking
              .filter(p => !p.isOutOfStock)
              .map(p => [p.productId, p.pendingOperationalQty])
          );

          const adjustedItems = dispatchItems
            .filter(it => pendingMap.has(it.productId))
            .map(it => {
              const pending = pendingMap.get(it.productId) ?? 0;
              const qty = Math.min(it.qty, pending);
              return { ...it, qty };
            })
            .filter(it => it.qty > 0);

          const hasDispatch = adjustedItems.length > 0;
          const hasOutOfStock = outOfStockItems.length > 0;

          if (!hasDispatch && action === 'Complete') {
            return this.pecalService.closeDispatch(dispatchId);
          }

          if (!hasDispatch && hasOutOfStock) {
            return this.pecalService
              .markItemOutOfStock(dispatchId, outOfStockItems)
              .pipe(
                switchMap(() => this.pecalService.closeDispatch(dispatchId)),
                map(() => dispatchId)
              );
          }

          if (!hasDispatch && !hasOutOfStock) {
            this.snackbar.warning('No se detectó ningún cambio por registrar');
            return EMPTY;
          }

          return this.pecalService.saveDispatchItems(dispatchId, adjustedItems).pipe(
            switchMap(() => {
              if (!hasOutOfStock) return of(null);
              return this.pecalService.markItemOutOfStock(dispatchId, outOfStockItems);
            }),
            switchMap(() => this.pecalService.closeDispatch(dispatchId)),
            map(() => dispatchId)
          );
        }),
        tap(() => {
              localStorage.removeItem(`pecal-dispatch-draft-${orderId}`);
            }),
            switchMap(() => this.pecalService.getOrdersForWarehouse(this.buildFilters())),
            tap(orders => {
              this.orders = this.applyLocalFilters(orders);

              const updated = this.orders.find(o => o.id === orderId);

              if (updated?.status === 'Complete') {
                this.snackbar.success('Orden completada correctamente');
              } else {
                this.snackbar.success('Surtido guardado correctamente 📦');
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
    this.isLoading = true;

    this.pecalService.getOrdersForWarehouse(this.buildFilters()).pipe(
      finalize(() => {
        this.isLoading = false;
      }),
    ).subscribe({
      next: (res) => {
        this.orders = this.applyLocalFilters(res);
      },
      error: () => {
        this.orders = [];
      },
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
      width: '600px',
     
    });
  }


  


  hasPermission(permission: string): boolean {

    return this.permissions.includes(permission);
  }


  


  
}
