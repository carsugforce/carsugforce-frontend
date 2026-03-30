import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import {ColDef,GridApi,GridReadyEvent} from 'ag-grid-community';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ProductsService } from '../../../core/service/products.service';
import { Product } from '../../../core/models/product.models';
import { ProductActionsRendererComponent } from './product-actions-renderer.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProductFormComponent } from '../../../modals/credi-products/product-form.component';
import { LinesService } from '../../../core/service/lines.service';
import { ViewChild, ElementRef } from '@angular/core';
import { SnackbarService } from '../../../core/service/snackbar.service';

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

   constructor(
    private productsService: ProductsService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private linesService: LinesService,
    private snackbar: SnackbarService,
  ) {}

  @ViewChild('fileInput') fileInput!: ElementRef;
  // ============================
  // GRID
  // ============================
  private gridApi!: GridApi;

  rowData: Product[] = [];
  selectedLineId?: number;

  isImporting = false;

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
      cellRenderer: ProductActionsRendererComponent,
      
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

   expectedColumns = [
    'code',
    'description',
    'lineName',
    'type',
    'unit',
    'min',
    'max'
  ];

 

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

         this.productsService.createProduct(result).subscribe({
           next: () => {

            this.reloadProducts();

            this.dialog.open(ConfirmDialogComponent, {
              width: '350px',
              data: {
                type: 'success',
                title: 'Producto creado',
                message: 'El producto fue guardado correctamente.',
                confirmText: 'Aceptar'
              }
            });

          },
          error: () => {
            this.dialog.open(ConfirmDialogComponent, {
              width: '350px',
              data: {
                type: 'error',
                title: 'Error',
                message: 'No se pudo guardar el producto.',
                confirmText: 'Aceptar'
              }
            });
          }
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
             this.dialog.open(ConfirmDialogComponent, {
              width: '350px',
              data: {
                type: 'success',
                title: 'Producto actualizado',
                message: 'El producto fue actualizado correctamente.',
                confirmText: 'Aceptar'
              }
            });
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

  exportCsv() {
    this.gridApi.exportDataAsCsv({
      fileName: 'productos.csv',
      columnKeys: this.expectedColumns,
      processHeaderCallback: (params) => {
        return params.column.getColDef().field ?? '';
      }
    });
  }

  

  downloadTemplate(): void {

    const csvContent = this.expectedColumns.join(',') + '\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');

    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_productos.csv');

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  }

  openImportCsv(): void {
    this.fileInput.nativeElement.click();
  }

 handleFileImport(event: any): void {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e: any) => {
    const buffer = e.target.result as ArrayBuffer;

    let text = '';
    try {
      text = new TextDecoder('windows-1252').decode(buffer);
    } catch {
      text = new TextDecoder('utf-8').decode(buffer);
    }

    text = text.replace(/^\uFEFF/, '');

    const rows = text
      .split(/\r?\n/)
      .map((row: string) => row.trim())
      .filter((row: string) => row.length > 0);

    if (rows.length < 2) {
      this.snackbar.error('El archivo CSV está vacío.');
      return;
    }

    const headers = rows[0].split(',').map((h: string) => h.trim());

    const missingColumns = this.expectedColumns.filter(
      col => !headers.includes(col)
    );

    if (missingColumns.length > 0) {
      this.snackbar.error(
        `El CSV no tiene las columnas correctas. Faltan: ${missingColumns.join(', ')}`
      );
      return;
    }

    const data = rows.slice(1)
      .map((row: string) => row.split(',').map(v => v.replace('\r', '').trim()))
      .filter((values: string[]) => values.some((v: string) => v !== ''))
      .map((values: string[]) => {
        const obj: any = {};

        headers.forEach((header: string, index: number) => {
          let value: any = values[index] ?? '';

          if (typeof value === 'string') {
            value = value.trim();
          }

          if (header === 'min' || header === 'max') {
            const parsed = parseInt(String(value), 10);
            value = isNaN(parsed) ? 0 : parsed;
          }

          obj[header] = value;
        });

        return obj;
      });

    console.log('Productos parseados:', data);

    this.isImporting = true;

    this.productsService.importProducts(data).subscribe({
      next: (res: any) => {
        this.isImporting = false;

        if (!res.success) {
          const message = Array.isArray(res.errors)
            ? res.errors.join('\n')
            : 'No se pudo importar el archivo.';
          this.snackbar.error(message);
          return;
        }

        this.snackbar.success(
          `Importación completada. ${res.created} productos creados, ${res.updated} productos actualizados`
        );

        this.reloadProducts();
      },
      error: (err: any) => {
        this.isImporting = false;

        if (err.error?.errors) {
          const errorsObj = err.error.errors;
          const messages = Object.keys(errorsObj)
            .flatMap((key: string) => errorsObj[key]);

          this.snackbar.error(messages.join('\n'));
        } else if (typeof err.error === 'string') {
          this.snackbar.error(err.error);
        } else {
          this.snackbar.error('Error al importar el archivo.');
        }
      }
    });
  };

  reader.readAsArrayBuffer(file);
  event.target.value = '';
}











}
