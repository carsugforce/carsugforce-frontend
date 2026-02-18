import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent
} from 'ag-grid-community';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { ProductsService } from '../../../core/service/products.service';
import { Product } from '../../../core/models/product.models';
import { ProductActionsRendererComponent } from './product-actions-renderer.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProductFormComponent } from '../../../modals/credi-products/product-form.component';
import { LinesService } from '../../../core/service/lines.service';

@Component({
  standalone: true,
  selector: 'app-products',
  imports: [
    CommonModule,
    AgGridAngular
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {

  // ============================
  // GRID
  // ============================
  private gridApi!: GridApi;

  rowData: Product[] = [];
  selectedLineId?: number;

  colDefs: ColDef[] = [
    { field: 'lineId', hide: true },

    { field: 'code', headerName: 'Código', width: 110 },
    { field: 'description', headerName: 'Descripción', flex: 1 },
    { field: 'lineName', headerName: 'Línea', width: 200 },
    { field: 'type', headerName: 'Tipo', width: 140 },
    { field: 'unit', headerName: 'Unidad', width: 90 },
    { field: 'min', headerName: 'Min', width: 90, cellClass: 'text-right' },
    { field: 'max', headerName: 'Max', width: 90, cellClass: 'text-right' },

    {
      headerName: 'Acciones',
      width: 110,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: ProductActionsRendererComponent
    }
  ];

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true
  };

  gridOptions = {
    rowHeight: 44,
    headerHeight: 46,
    animateRows: true,
    context: {
      componentParent: this
    }
  };

  constructor(
    private productsService: ProductsService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private linesService: LinesService
  ) {}

  // ============================
  // INIT
  // ============================
  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {
      this.selectedLineId = params['lineId']
        ? Number(params['lineId'])
        : undefined;

      if (this.gridApi && this.selectedLineId) {
        this.applyLineFilter();
      }
    });

    this.reloadProducts();
  }

  // ============================
  // GRID READY
  // ============================
  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;

    if (this.selectedLineId) {
      this.applyLineFilter();
    }
  }

  // ============================
  // FILTER
  // ============================
  private applyLineFilter(): void {
    this.gridApi.setFilterModel({
      lineId: {
        filterType: 'number',
        type: 'equals',
        filter: this.selectedLineId
      }
    });

    this.gridApi.onFilterChanged();
  }

  // ============================
  // QUICK SEARCH
  // ============================
  onQuickFilterChanged(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.gridApi.setGridOption('quickFilterText', value);
  }

  // ============================
  // CREATE
  // ============================
  openCreateProduct(): void {
    this.linesService.getLines().subscribe(lines => {
      const dialogRef = this.dialog.open(ProductFormComponent, {
        width: '800px',
        disableClose: true,
        data: {
          mode: 'create',
          lines
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (!result) return;

        // Código automático
        if (!result.code) {
          result.code = this.generateNextCode();
        }

        // Código duplicado
        if (this.codeExists(result.code)) {
          alert('El código ya existe');
          return;
        }

        this.productsService.createProduct(result).subscribe(() => {
          this.reloadProducts();
        });
      });
    });
  }

  // ============================
  // EDIT
  // ============================
  openEditProduct(product: Product): void {
    this.linesService.getLines().subscribe(lines => {
      const dialogRef = this.dialog.open(ProductFormComponent, {
        width: '800px',
        disableClose: true,
        data: {
          mode: 'edit',
          product,
          lines
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (!result) return;

        this.productsService
          .updateProduct(product.id, result)
          .subscribe(() => {
            this.reloadProducts();
          });
      });
    });
  }

  // ============================
  // DELETE
  // ============================
  confirmDelete(product: Product): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        type: 'warning',
        title: 'Eliminar producto',
        message: `¿Seguro que deseas eliminar el producto "${product.description}"?`,
        showCancel: true,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    ref.afterClosed().subscribe(ok => {
      if (!ok) return;

      this.productsService.deleteProduct(product.id).subscribe(() => {
        this.gridApi.applyTransaction({ remove: [product] });
      });
    });
  }

  // ============================
  // HELPERS
  // ============================
  private generateNextCode(): string {
    const numericCodes = this.rowData
      .map(p => Number(p.code))
      .filter(n => !isNaN(n));

    const max = numericCodes.length
      ? Math.max(...numericCodes)
      : 0;

    return String(max + 1);
  }

  private codeExists(code: string): boolean {
    return this.rowData.some(p => p.code === code);
  }

  private reloadProducts(): void {
    this.productsService.getProducts().subscribe(data => {
      this.rowData = data;
    });
  }
}
