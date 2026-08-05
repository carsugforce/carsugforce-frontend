import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
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
import Papa from 'papaparse';

@Component({
  standalone: true,
  selector: 'app-products',
  imports: [CommonModule, AgGridAngular],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
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
      width: 235,
      minWidth: 235,
      maxWidth: 235,
      pinned: 'right',

      sortable: false,
      resizable: false,

      // El filtro se calcula usando la visibilidad real del producto.
      filter: 'agTextColumnFilter',

      filterValueGetter: (params) =>
        params.data?.isVisibleInPecal === false ? 'Oculto' : 'Mostrando',

      filterParams: {
        filterOptions: [
          'empty',

          {
            displayKey: 'mostrando',
            displayName: 'Mostrando',
            predicate: (_filterValues: string[], cellValue: string) =>
              cellValue === 'Mostrando',
            numberOfInputs: 0,
          },

          {
            displayKey: 'oculto',
            displayName: 'Oculto',
            predicate: (_filterValues: string[], cellValue: string) =>
              cellValue === 'Oculto',
            numberOfInputs: 0,
          },
        ],

        buttons: ['reset'],
      },

      cellRenderer: ProductActionsRendererComponent,
    },
  ];

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: true,
  };

  gridOptions = {
    rowHeight: 44,
    headerHeight: 46,
    animateRows: true,
    context: {
      componentParent: this,
    },
  };

  expectedColumns = [
    'code',
    'description',
    'lineName',
    'type',
    'unit',
    'min',
    'max',
    'visibility',
  ];

  // ============================
  // INIT
  // ============================
  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
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
        filter: this.selectedLineId,
      },
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
    this.linesService.getLines().subscribe((lines) => {
      const dialogRef = this.dialog.open(ProductFormComponent, {
        width: '800px',
        disableClose: true,
        data: {
          mode: 'create',
          lines,
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
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
                confirmText: 'Aceptar',
              },
            });
          },
          error: () => {
            this.dialog.open(ConfirmDialogComponent, {
              width: '350px',
              data: {
                type: 'error',
                title: 'Error',
                message: 'No se pudo guardar el producto.',
                confirmText: 'Aceptar',
              },
            });
          },
        });
      });
    });
  }

  // ============================
  // EDIT
  // ============================
  openEditProduct(product: Product): void {
    this.linesService.getLines().subscribe((lines) => {
      const dialogRef = this.dialog.open(ProductFormComponent, {
        width: '800px',
        disableClose: true,
        data: {
          mode: 'edit',
          product,
          lines,
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (!result) return;

        this.productsService.updateProduct(product.id, result).subscribe(() => {
          this.reloadProducts();
          this.dialog.open(ConfirmDialogComponent, {
            width: '350px',
            data: {
              type: 'success',
              title: 'Producto actualizado',
              message: 'El producto fue actualizado correctamente.',
              confirmText: 'Aceptar',
            },
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
        cancelText: 'Cancelar',
      },
    });

    ref.afterClosed().subscribe((ok) => {
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
      .map((p) => Number(p.code))
      .filter((n) => !isNaN(n));

    const max = numericCodes.length ? Math.max(...numericCodes) : 0;

    return String(max + 1);
  }

  private codeExists(code: string): boolean {
    return this.rowData.some((p) => p.code === code);
  }

  private reloadProducts(): void {
    this.productsService.getProducts().subscribe((data) => {
      this.rowData = data;
    });
  }

  exportCsv(): void {
    const productsToExport: Product[] = [];

    // Exporta respetando los filtros y el orden actual del grid.
    this.gridApi.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) {
        productsToExport.push(node.data as Product);
      }
    });

    if (productsToExport.length === 0) {
      this.snackbar.error('No hay productos para exportar.');

      return;
    }

    const exportData = productsToExport.map((product) => ({
      code: product.code ?? '',
      description: product.description ?? '',
      lineName: product.lineName ?? '',
      type: product.type ?? '',
      unit: product.unit ?? '',
      min: product.min ?? 0,
      max: product.max ?? 0,

      // true = 1 y false = 0
      visibility: product.isVisibleInPecal === false ? 0 : 1,
    }));

    const csv = Papa.unparse(exportData, {
      columns: [
        'code',
        'description',
        'lineName',
        'type',
        'unit',
        'min',
        'max',
        'visibility',
      ],
      header: true,
      newline: '\r\n',
      quotes: true,
    });

    // BOM para que Excel reconozca correctamente acentos y ñ.
    const csvWithBom = '\uFEFF' + csv;

    const blob = new Blob([csvWithBom], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const today = new Date();

    const date =
      `${today.getFullYear()}-` +
      `${String(today.getMonth() + 1).padStart(2, '0')}-` +
      `${String(today.getDate()).padStart(2, '0')}`;

    link.href = url;
    link.download = `productos_${date}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    this.snackbar.success(
      `${productsToExport.length} productos exportados correctamente.`,
    );
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

  handleFileImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (loadEvent: ProgressEvent<FileReader>) => {
      const buffer = loadEvent.target?.result as ArrayBuffer;

      const text = new TextDecoder('windows-1252')
        .decode(buffer)
        .replace(/^\uFEFF/, '')
        .normalize('NFC');

      Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim(),

        complete: (result) => {
          const headers = result.meta.fields ?? [];

          const requiredColumns = ['code', 'visibility'];

          const missingColumns = requiredColumns.filter(
            (column) => !headers.includes(column),
          );

          if (missingColumns.length > 0) {
            this.snackbar.error(
              `Faltan las columnas: ${missingColumns.join(', ')}`,
            );

            input.value = '';
            return;
          }

          if (result.errors.length > 0) {
            const messages = result.errors
              .slice(0, 10)
              .map((error) => `Fila ${(error.row ?? 0) + 2}: ` + error.message);

            this.snackbar.error(messages.join('\n'));

            input.value = '';
            return;
          }

          const data = result.data
            .map((row) => ({
              code: String(row['code'] ?? '').trim(),

              visibility: Number.parseInt(
                String(row['visibility'] ?? '').trim(),
                10,
              ),
            }))
            .filter((item) => item.code !== '');

          const invalidRows = data
            .map((item, index) => ({
              row: index + 2,
              visibility: item.visibility,
            }))
            .filter((item) => item.visibility !== 0 && item.visibility !== 1);

          if (invalidRows.length > 0) {
            const messages = invalidRows
              .slice(0, 10)
              .map(
                (item) => `Fila ${item.row}: ` + 'visibility debe ser 1 o 0.',
              );

            this.snackbar.error(messages.join('\n'));

            input.value = '';
            return;
          }

          if (data.length === 0) {
            this.snackbar.error('El CSV no contiene registros válidos.');

            input.value = '';
            return;
          }

          this.isImporting = true;

          this.productsService.importPecalVisibility(data).subscribe({
            next: (response) => {
              this.isImporting = false;

              const notFoundCodes = response.notFoundCodes ?? [];

              let message =
                'Visibilidad actualizada. ' +
                `${response.updatedProducts} productos ` +
                'actualizados.';

              if (notFoundCodes.length > 0) {
                message +=
                  ` Códigos no encontrados: ` + notFoundCodes.join(', ');
              }

              this.snackbar.success(message);

              this.reloadProducts();

              input.value = '';
            },

            error: (error) => {
              this.isImporting = false;

              const backendErrors = error.error?.errors;

              if (Array.isArray(backendErrors)) {
                this.snackbar.error(backendErrors.join('\n'));
              } else if (typeof error.error === 'string') {
                this.snackbar.error(error.error);
              } else {
                this.snackbar.error(
                  'No se pudo actualizar ' + 'la visibilidad PECAL.',
                );
              }

              input.value = '';
            },
          });
        },
      });
    };

    reader.readAsArrayBuffer(file);
  }
}
