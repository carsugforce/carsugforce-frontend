import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, finalize } from 'rxjs';
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
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
  ],
  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-MX',
    },
  ],
})
export class MyordersPecal implements OnInit {
  constructor(private pecalService: PecalService, private dialog: MatDialog, private userService: UserService) {}
  private fb = inject(FormBuilder);

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

  loadOrders() {
    this.isLoading = true;

    this.pecalService.getMyOrders(this.buildFilters()).pipe(
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

  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
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
