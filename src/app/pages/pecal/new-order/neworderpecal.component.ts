import { CommonModule } from '@angular/common';
import { Component, ViewChild, OnInit, HostListener } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSidenavModule, MatDrawer } from '@angular/material/sidenav';
import { MatSelectModule } from '@angular/material/select';

import { AgGridModule } from 'ag-grid-angular';
import {
  ColDef,
  GridOptions,
  GetRowIdParams,
  ICellRendererParams,
} from 'ag-grid-community';

import { OrderCartPecalComponent } from '../../../shared/components/drawers/order-cart-pecal.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { QtyStepperRendererComponent } from './qty-stepper-renderer/qty-stepper-renderer-component';

import { PecalService } from '../../../core/service/pecal.service';
import { PecalProduct } from '../../../core/models/pecalproduct.model';
import { ObservationsRendererComponent } from './observations-renderer/observations-renderer.component';
import { ProductCellComponent } from './product-cell/product-cell.component';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

import { PecalOrderEdit } from '../../../core/models/pecal-order-edit';
import { forkJoin, switchMap, tap, of } from 'rxjs';

import { RowClassParams } from 'ag-grid-community';
import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  standalone: true,
  selector: 'app-neworder-pecal',
  templateUrl: './neworderpecal.component.html',
  styleUrls: ['./neworderpecal.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatBadgeModule,
    MatDialogModule,
    MatSidenavModule,
    MatSelectModule,
    OrderCartPecalComponent,
    AgGridModule,
  ],
})
export class NewOrderPecalComponent implements OnInit {
  constructor(
    private pecalService: PecalService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private snackbar: SnackbarService,
  ) {}
  mode: 'create' | 'edit' = 'create';
  orderNumber?: string;

  get isCreateMode(): boolean {
    return this.mode === 'create';
  }
  editoradditems?: string;

  addQty?: number; 
  pendingQty?: number; 

  /* ============================
     DRAWER
  ============================ */
  @ViewChild('cartDrawer') cartDrawer!: MatDrawer;
  private mobileQuery = window.matchMedia('(max-width: 900px)');
  private isMobile = this.mobileQuery.matches;

  orderId?: number;

  pendingMissingItems: { productId: number; pendingQty: number }[] | null =
    null;

  /* ============================
     GRID DATA
  ============================ */
  products: PecalProduct[] = [];
  cartCount = 0;
  cartOpen = false;
  selectedLine: string = '';
  lines: string[] = [];
  gridApi: any;

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
  };

  columnDefs: ColDef[] = [];

  currentOrderId: number | null = null;
  notes: string = '';

  gridContext = { componentParent: this };

  gridOptions = {
    rowHeight: 90,
    headerHeight: 46,
    animateRows: true,
    stopEditingWhenCellsLoseFocus: false,
    suppressCellFocus: true,
    cacheQuickFilter: false,
    suppressClickEdit: true,
    suppressCellSelection: true,
    suppressRowClickSelection: true,
    context: {
      componentParent: this,
    },

    getRowId: (params: GetRowIdParams) => String(params.data.id),

    isExternalFilterPresent: () => {
      return !!this.selectedLine;
    },

    doesExternalFilterPass: (node: any) => {
      if (!this.selectedLine) return true;

      return node.data.lineName === this.selectedLine;
    },
  };

  isMobileM(): boolean {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent,
    );
  }

  getColumnDefs(): ColDef[] {
    const mobile = this.isMobileM();
    return [
      {
        field: 'description',
        headerName: 'Producto',
        flex: mobile ? 3 : 1,
        minWidth: 260,
        cellRenderer: ProductCellComponent,
        getQuickFilterText: (params) => params.value ?? '',
      },
      {
        field: 'lineName',
        headerName: 'Linea',
        hide: mobile,
        getQuickFilterText: () => '',
      },

      {
        headerName: 'Cantidad',
        field: 'qty',
        cellRenderer: QtyStepperRendererComponent,
        width: 220,

        editable: false,
        suppressNavigable: true,
        suppressKeyboardEvent: () => true,
        getQuickFilterText: () => '',
      },
      {
        headerName: 'Observaciones',
        field: 'observations',
        width: 300,
        cellRenderer: ObservationsRendererComponent,
        suppressNavigable: true,
        editable: false,
        suppressKeyboardEvent: () => true,
        getQuickFilterText: () => '',
      },
    ];
  }

  /* ============================
     INIT
  ============================ */
  ngOnInit(): void {
    // =========================
    // 1️⃣ LEER STATE (FUENTE ÚNICA DE VERDAD)
    // =========================
    const state = history.state as {
      mode?: 'add-missing';
      orderNumber?: string;
      items?: {
        productId: number;
        pendingQty: number;
        desabasto?: boolean;
      }[];
    };

    // =========================
    // 2️⃣ CONFIG INICIAL
    // =========================
    this.loadLines();
    this.columnDefs = this.getColumnDefs();

    // =========================
    // 3️⃣ RUTA
    // =========================
    this.route.paramMap
      .pipe(
        switchMap((params) => {

        
          const id = params.get('orderId');

          //  CREATE
          if (!id) {
            this.mode = 'create';
            return this.loadProducts();
          }

          // EDIT
          this.mode = 'edit';
          this.orderId =+ id;
      

         
          console.log(state)
       

          if (state?.mode === 'add-missing' && state.items?.length) {
              this.editoradditems = 'Agregar productos: ' + state.orderNumber;

            return this.loadProducts().pipe(
              tap(() => {
                this.applyMissingItems(state.items!);
              }),
            );
          }
             

          //  EDICIÓN NORMAL
          return forkJoin({
            products: this.loadProducts(),
            order: this.pecalService.getOrderForEdit(this.orderId),
          });
        }),
      )
      .subscribe({
        next: (result) => {
          // =========================
          //  EDIT NORMAL
          // =========================
          if (result && 'order' in result) {
            const order = result.order;

            this.orderNumber = order.orderNumber;
            this.notes = order.notes ?? '';
           
              this.editoradditems = (state?.mode === 'add-missing' ? 'Agregar productos: ' : 'Editar orden: ') + this.orderNumber;



            this.products.forEach((p) => {
              const item = order.items.find((i) => i.productId === p.id);
              if (item) {
                p.qty = item.qty;
                p.committedQty = item.qty;
                p._draftQty = item.qty;
                p.observations = item.observations ?? '';
              }
            });

            this.recalcCartCount();
          }
        },
      });
     
  }

  loadOrderForEdit(orderId: number): void {
    this.pecalService.getOrderForEdit(orderId).subscribe({
      next: (order: PecalOrderEdit) => {
        this.orderNumber = order.orderNumber;
        this.notes = order.notes ?? '';

        // hidratar productos
        this.products.forEach((p) => {
          const item = order.items.find((i) => i.productId === p.id);

          if (item) {
            p.qty = item.qty;
            p.committedQty = item.qty;
            p._draftQty = item.qty;
            p.observations = item.observations ?? '';
          }
        });

        this.recalcCartCount();
      },
      error: (err) => {
        this.dialog.open(ConfirmDialogComponent, {
          width: '360px',
          data: {
            type: 'error',
            title: 'No editable',
            message: err.error ?? 'La orden ya no puede editarse',
            confirmText: 'Aceptar',
          },
        });

        this.router.navigate(['/pecal']); // regresa
      },
    });
  }

  applyMissingItems(items: { productId: number; pendingQty: number; desabasto?: boolean }[]): void {
    const map = new Map(items.map(i => [i.productId, i]));

    this.products.forEach(p => {
      const m = map.get(p.id);

      // reset TOTAL
      p.qty = 0;
      p.committedQty = 0;
      p._draftQty = 0;
      p.addQty = 0;

      if (!m) return;

      p.pendingQty = m.pendingQty;
      p.isOutOfStock = !!m.desabasto;
    });
  }

  onGridReady(params: any): void {
    this.gridApi = params.api;
    console.log('GRID READY ✅');
  }

  loadLines(): void {
    this.pecalService.getLines().subscribe((data) => {
      //console.log(data);
      this.lines = data.map((l) => l.description);
    });
  }
  /* ============================
     QUICK SEARCH (NO SE TOCA)
  ============================ */
  onQuickFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.gridApi.setGridOption('quickFilterText', value);
  }

  onLineFilterChange(): void {
    if (this.gridApi) {
      this.gridApi.onFilterChanged();
    }
  }

  /* ============================
     LOAD PRODUCTS
  ============================ */
  private loadProducts() {
    return this.pecalService.getPecalProducts().pipe(
      tap((data) => {
        this.products = data.map((p) => ({
          ...p,
          qty: 0,
          committedQty: 0,
          overMaxConfirmed: false,
          _draftQty: 0,
          observations: '',
        }));
      }),
    );
  }

  /* ============================
     CART LOGIC
  ============================ */
  recalcCartCount(): void {
    this.cartCount = this.products.reduce(
      (sum, p) => sum + (p.committedQty ?? 0),
      0,
    );
  }

  increase(p: PecalProduct): void {
    const attempted = (p.qty ?? 0) + 1;

    if (attempted > p.max && !p.overMaxConfirmed) {
      this.confirmOverMax(p, attempted);
      return;
    }

    p.qty = attempted;
    p.committedQty = attempted;
    this.recalcCartCount();
  }

  decrease(p: PecalProduct): void {
    if ((p.qty ?? 0) <= 0) return;

    p.qty!--;
    p.committedQty = p.qty;

    if (p.qty <= p.max) {
      p.overMaxConfirmed = false;
    }

    this.recalcCartCount();
  }

  onQtyInput(p: PecalProduct, value: string): void {
    let attempted = Number(value);
    if (isNaN(attempted) || attempted < 0) attempted = 0;

    if (attempted > p.max && !p.overMaxConfirmed) {
      this.confirmOverMax(p, attempted);
      return;
    }

    p.qty = attempted;
    p.committedQty = attempted;

    if (attempted <= p.max) {
      p.overMaxConfirmed = false;
    }

    this.recalcCartCount();
  }

  private confirmOverMax(p: PecalProduct, attemptedQty: number): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        type: 'warning',
        title: 'Cantidad superior al máximo',
        message: `El máximo recomendado para ${p.description} es ${p.max}. ¿Deseas continuar con ${attemptedQty}?`,
        showCancel: true,
        cancelText: 'Cancelar',
        confirmText: 'Continuar',
      },
    });

    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        p.overMaxConfirmed = true;
        p.qty = attemptedQty;
        p.committedQty = attemptedQty;
      } else {
        p.qty = p.max;
        p.committedQty = p.max;
        p.overMaxConfirmed = false;
      }
      this.recalcCartCount();
    });
  }

  /* ============================
     CART ACTIONS (NO TOCADOS)
  ============================ */
  get selectedProducts(): PecalProduct[] {
    return this.products.filter((p) => (p.committedQty ?? 0) > 0);
  }

  openCart(): void {
    this.cartOpen = true;
  }

  closeCart(): void {
    this.cartOpen = false;
  }

  removeFromCart(p: PecalProduct): void {
    p.qty = 0;
    p.committedQty = 0;
    p.overMaxConfirmed = false;
    this.recalcCartCount();
  }

  onCartQtyChange(e: { item: any; qty: number }): void {
    this.onQtyInput(e.item, String(e.qty));
  }

  buildOrderPayload() {
    return {
      notes: this.notes,
      items: this.selectedProducts.map((p) => ({
        productId: p.id,
        qty: p.committedQty,
        observations: p.observations ?? null,
      })),
    };
  }

  /*onSaveDraft(): void {
      if (this.selectedProducts.length === 0) {
        return;
      }

      const payload = this.buildOrderPayload();

      this.pecalService
        .saveDraft(this.currentOrderId, payload)
        .subscribe({
          next: res => {
            this.currentOrderId = res.id;
            this.dialog.open(ConfirmDialogComponent, {
              width: '350px',
              data: {
                type: 'success',
                title: 'Guardado!',
                message: 'Pedido guardado', res,
                confirmText: 'Aceptar',
              },
            });
          },
          error: err => {
           
            this.dialog.open(ConfirmDialogComponent, {
            width: '350px',
            data: {
              type: 'error',
              title: 'Error',
              message: 'Error guardando borrador', err,
              confirmText: 'Aceptar',
            },
          });
          }
        });
    }*/

  onSendOrder(): void {
    if (this.selectedProducts.length === 0) return;

    const payload = this.buildOrderPayload();
    const isAddMissingMode = history.state?.mode === 'add-missing';
    //console.log(isAddMissingMode);
    let request$;

    if (this.mode === 'create') {
      request$ = this.pecalService.sendOrder(payload);
    } else if (isAddMissingMode) {
      if (!this.orderId) return;
      request$ = this.pecalService.addMissingItems(this.orderId!, {
        items: this.selectedProducts.map((p) => ({
          productId: p.id,
          qty: p.committedQty,
          observations: p.observations ?? ''
        })),
      });
    } else {
      request$ = this.pecalService.updateOrder(this.orderId!, payload);
    }

    request$.subscribe({
      next: () => {
        this.dialog.open(ConfirmDialogComponent, {
          width: '350px',
          data: {
            type: 'success',
            title: 'Operación exitosa',
            message: isAddMissingMode
              ? 'Productos agregados al pedido'
              : 'Pedido guardado',
            confirmText: 'Aceptar',
          },
        });

        this.resetOrderState();
        this.closeCart();
        this.router.navigate(['/pecal/my-orders']);
      },

      error: (err) => {
       
        if (err.status === 409) {
          this.snackbar.warning(
            err.error?.message ?? 'No se detectaron cambios para aplicar',
          );
          return;
        }

        //ERROR REAL
        this.snackbar.error(err.error?.message ?? 'Error al guardar cambios');
      },
    });
  }
  resetOrderState(): void {
    this.currentOrderId = null;
    this.notes = '';

    this.products.forEach((p) => {
      p.qty = 0;
      p.committedQty = 0;
      p.overMaxConfirmed = false;
      p.observations = '';
    });

    this.cartCount = 0;
  }
}
