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
import { PecalOrderDetailDialogComponent } from '../../../modals/pecal-order-detail/pecal-order-detail-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PecalDispatchHistoryDialogComponent } from '../../../modals/pecal-dispatch-history/pecal-dispatch-history-dialog.component';
import { ReceiveDispatchListDialogComponent } from '../../../modals/recive-dispatch-suc/receive-dispatch-list-dialog.component';
import { UserService } from '../../../core/service/user.service';

type OrderTab = 'open' | 'complete' | 'partial' | 'closed';

@Component({
  standalone: true,
  selector: 'app-pecal-my-orders',
  templateUrl: './myorderspecal.component.html',
  styleUrls: ['./myorderspecal.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
  ],
})
export class MyordersPecal {
  constructor(private pecalService: PecalService, private dialog: MatDialog, private userService: UserService) {}
  permissions: string[] = [];

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

  orders: PecalOrderList[] = [];
  selectedTab: OrderTab = 'open';
  
  ngOnInit(): void {
    
     this.userService.getMe().subscribe((me: any) => {
      this.permissions = me.permissions ?? [];
    });
    
    
    this.loadOrders();
    
    
  }

  loadOrders() {
    this.pecalService.getMyOrders().subscribe((res) => {
      this.orders = res;
    });
  }

  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
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

  getStatusClass(status: string): string {
    return this.ORDER_STATUS_MAP[status]?.color ?? '';
  }

  normalizeDate(date: string) {
    return new Date(date + 'Z');
  }

  openDetail(order: PecalOrderList) {
    this.dialog.open(PecalOrderDetailDialogComponent, {
      data: order,
      hasBackdrop: true,
      panelClass: 'order-detail-dialog',
    });
  }

  openDispatchHistory(order: PecalOrderList) {
    this.dialog.open(PecalDispatchHistoryDialogComponent, {
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      },
      panelClass: 'dispatch-history-dialog',
      width: '600px',
    });
  }

  openReceiveDispatch(order: PecalOrderList) {
      const dialogRef = this.dialog.open(ReceiveDispatchListDialogComponent, {
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          pendingDispatches: []
        },
        panelClass: 'receive-dispatch-dialog',
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw'
      });

      dialogRef.afterClosed().subscribe(() => {
        this.loadOrders();
      });
  }

  
  openOrder(order: any) {
  if (order.pendingDispatchesCount > 0) {
    this.openReceiveDispatch(order);
  } else {
    this.openDetail(order);
  }
}

  


}
