import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
} from 'ag-grid-community';

import { MatDialog } from '@angular/material/dialog';

import Papa from 'papaparse';

import {
  Product,
  ProductImportRow,
} from '../../../core/models/product.models';

import { ProductsService } from '../../../core/service/products.service';
import { LinesService } from '../../../core/service/lines.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

import { ProductActionsRendererComponent } from './product-actions-renderer.component';

import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

import { ProductFormComponent } from '../../../modals/credi-products/product-form.component';

@Component({
  standalone: true,
  selector: 'app-products',

  imports: [
    CommonModule,
    AgGridAngular,
  ],

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

  @ViewChild('fileInput')
  fileInput!: ElementRef<HTMLInputElement>;

  private gridApi!: GridApi;

  rowData: Product[] = [];

  selectedLineId?: number;

  isImporting = false;

  // ============================================================
  // COLUMNAS EXACTAS DEL CSV
  // ============================================================

  colDefs: ColDef[] = [
    {
      field: 'lineId',
      hide: true,
    },

    {
      field: 'code',
      headerName: 'code',
      width: 105,
    },

    {
      field: 'description',
      headerName: 'description',
      minWidth: 260,
      flex: 1,
    },
    {
      field: 'lineName',
      headerName: 'lineName',
      width: 160,
    },

    {
      field: 'type',
      headerName: 'type',
      width: 125,
    },

    {
      field: 'unit',
      headerName: 'unit',
      width: 85,
    },

    {
      field: 'pesable',
      headerName: 'Pesable',
      width: 100,
    },

    {
      field: 'min',
      headerName: 'min',
      width: 85,
      cellClass: 'text-right',
    },

    {
      field: 'max',
      headerName: 'max',
      width: 85,
      cellClass: 'text-right',
    },

    {
      headerName: 'visibility',
      width: 105,

      valueGetter: (params) =>
        params.data?.isVisibleInPecal === false
          ? 0
          : 1,
    },

    {
      field: 'family',
      headerName: 'Family',
      width: 150,
    },

    {
      field: 'costo',
      headerName: 'Costo',
      width: 105,
      cellClass: 'text-right',
    },

    {
      field: 'precio',
      headerName: 'Precio',
      width: 105,
      cellClass: 'text-right',
    },

    {
      field: 'partida',
      headerName: 'PARTIDA',
      width: 160,
    },

    {
      field: 'criterio',
      headerName: 'CRITERIO',
      width: 160,
    },

    {
      field: 'clase',
      headerName: 'CLASE',
      width: 190,
    },

    {
      field: 'tipoEgreso',
      headerName: 'TIPO EGRESO',
      width: 190,
    },

    {
      headerName: 'Acciones',

      width: 235,
      minWidth: 235,
      maxWidth: 235,

      pinned: 'right',

      sortable: false,
      resizable: false,

      filter: 'agTextColumnFilter',

      filterValueGetter: (params) =>
        params.data?.isVisibleInPecal === false
          ? 'Oculto'
          : 'Mostrando',

      filterParams: {
        filterOptions: [
          'empty',

          {
            displayKey: 'mostrando',
            displayName: 'Mostrando',

            predicate: (
              _filterValues: string[],
              cellValue: string,
            ) =>
              cellValue === 'Mostrando',

            numberOfInputs: 0,
          },

          {
            displayKey: 'oculto',
            displayName: 'Oculto',

            predicate: (
              _filterValues: string[],
              cellValue: string,
            ) =>
              cellValue === 'Oculto',

            numberOfInputs: 0,
          },
        ],

        buttons: ['reset'],
      },

      cellRenderer:
        ProductActionsRendererComponent,
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

  // ============================================================
  // COLUMNAS EXACTAS DEL CSV
  // ============================================================

  expectedColumns = [
    'code',
    'description',
    
    'lineName',
    'type',
    'unit',
    'Pesable',
    'min',
    'max',
    'visibility',
    'Family',
    'Costo',
    'Precio',
    'PARTIDA',
    'CRITERIO',
    'CLASE',
    'TIPO EGRESO',
  ];

  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {
    this.route.queryParams.subscribe(
      (params) => {
        this.selectedLineId =
          params['lineId']
            ? Number(params['lineId'])
            : undefined;

        if (
          this.gridApi &&
          this.selectedLineId
        ) {
          this.applyLineFilter();
        }
      },
    );

    this.reloadProducts();
  }

  // ============================================================
  // GRID
  // ============================================================

  onGridReady(
    event: GridReadyEvent,
  ): void {
    this.gridApi = event.api;

    if (this.selectedLineId) {
      this.applyLineFilter();
    }
  }

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

  // ============================================================
  // BUSCADOR
  // ============================================================

  onQuickFilterChanged(
    event: Event,
  ): void {
    const value =
      (
        event.target as HTMLInputElement
      ).value;

    this.gridApi.setGridOption(
      'quickFilterText',
      value,
    );
  }

  // ============================================================
  // CREATE
  // ============================================================

  openCreateProduct(): void {
    this.linesService
      .getLines()
      .subscribe((lines) => {
        const dialogRef =
          this.dialog.open(
            ProductFormComponent,
            {
              width: '800px',
              disableClose: true,

              data: {
                mode: 'create',
                lines,
              },
            },
          );

        dialogRef
          .afterClosed()
          .subscribe((result) => {
            if (!result) {
              return;
            }

            if (!result.code) {
              result.code =
                this.generateNextCode();
            }

            if (
              this.codeExists(
                result.code,
              )
            ) {
              this.snackbar.error(
                'El código ya existe.',
              );

              return;
            }

            this.productsService
              .createProduct(result)
              .subscribe({
                next: () => {
                  this.reloadProducts();

                  this.dialog.open(
                    ConfirmDialogComponent,
                    {
                      width: '350px',

                      data: {
                        type: 'success',
                        title:
                          'Producto creado',

                        message:
                          'El producto fue guardado correctamente.',

                        confirmText:
                          'Aceptar',
                      },
                    },
                  );
                },

                error: () => {
                  this.dialog.open(
                    ConfirmDialogComponent,
                    {
                      width: '350px',

                      data: {
                        type: 'error',
                        title: 'Error',

                        message:
                          'No se pudo guardar el producto.',

                        confirmText:
                          'Aceptar',
                      },
                    },
                  );
                },
              });
          });
      });
  }

  // ============================================================
  // EDIT
  // ============================================================

  openEditProduct(
    product: Product,
  ): void {
    this.linesService
      .getLines()
      .subscribe((lines) => {
        const dialogRef =
          this.dialog.open(
            ProductFormComponent,
            {
              width: '800px',
              disableClose: true,

              data: {
                mode: 'edit',
                product,
                lines,
              },
            },
          );

        dialogRef
          .afterClosed()
          .subscribe((result) => {
            if (!result) {
              return;
            }

            this.productsService
              .updateProduct(
                product.id,
                result,
              )
              .subscribe({
                next: () => {
                  this.reloadProducts();

                  this.dialog.open(
                    ConfirmDialogComponent,
                    {
                      width: '350px',

                      data: {
                        type: 'success',

                        title:
                          'Producto actualizado',

                        message:
                          'El producto fue actualizado correctamente.',

                        confirmText:
                          'Aceptar',
                      },
                    },
                  );
                },

                error: () => {
                  this.snackbar.error(
                    'No se pudo actualizar el producto.',
                  );
                },
              });
          });
      });
  }

  // ============================================================
  // DELETE
  // ============================================================

  confirmDelete(
    product: Product,
  ): void {
    const ref =
      this.dialog.open(
        ConfirmDialogComponent,
        {
          width: '380px',

          data: {
            type: 'warning',

            title:
              'Eliminar producto',

            message:
              `¿Seguro que deseas eliminar el producto "${product.description}"?`,

            showCancel: true,

            confirmText:
              'Eliminar',

            cancelText:
              'Cancelar',
          },
        },
      );

    ref.afterClosed().subscribe(
      (ok) => {
        if (!ok) {
          return;
        }

        this.productsService
          .deleteProduct(product.id)
          .subscribe({
            next: () => {
              this.gridApi
                .applyTransaction({
                  remove: [product],
                });

              this.snackbar.success(
                'Producto eliminado.',
              );
            },

            error: () => {
              this.snackbar.error(
                'No se pudo eliminar el producto.',
              );
            },
          });
      },
    );
  }

  // ============================================================
  // IMPORT CSV
  // ============================================================

  openImportCsv(): void {
    if (this.isImporting) {
      return;
    }

    this.fileInput
      .nativeElement
      .click();
  }

  handleFileImport(
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];

    if (
      !file ||
      this.isImporting
    ) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = (
      loadEvent:
        ProgressEvent<FileReader>,
    ) => {
      const buffer =
        loadEvent.target
          ?.result as ArrayBuffer;

      const text =
        new TextDecoder(
          'windows-1252',
        )
          .decode(buffer)
          .replace(
            /^\uFEFF/,
            '',
          )
          .normalize('NFC');

      Papa.parse<
        Record<string, string>
      >(text, {
        header: true,

        skipEmptyLines:
          'greedy',

        // ====================================================
        // TODO A MINÚSCULAS PARA NO DEPENDER DE MAYÚSCULAS
        // ====================================================

        transformHeader:
          (header) =>
            header
              .trim()
              .toLowerCase(),

        complete:
          (result) => {
            // ================================================
            // ERROR CSV
            // ================================================

            if (
              result.errors.length >
              0
            ) {
              const messages =
                result.errors
                  .slice(0, 10)
                  .map(
                    (error) =>
                      `Fila ${
                        (error.row ??
                          0) + 2
                      }: ${
                        error.message
                      }`,
                  );

              this.snackbar.error(
                messages.join('\n'),
              );

              input.value = '';

              return;
            }

            // ================================================
            // VALIDAR HEADERS
            // ================================================

            const headers =
              result.meta.fields ??
              [];

            const requiredHeaders =
              this.expectedColumns.map(
                (x) =>
                  x.toLowerCase(),
              );

            const missingHeaders =
              requiredHeaders.filter(
                (required) =>
                  !headers.includes(
                    required,
                  ),
              );

            if (
              missingHeaders.length >
              0
            ) {
              this.snackbar.error(
                `Faltan columnas: ${missingHeaders.join(', ')}`,
              );

              input.value = '';

              return;
            }

            // ================================================
            // MAPEAR LAS 17 COLUMNAS
            // ================================================

            const products:
              ProductImportRow[] =
              result.data
                .map((row) => ({
                  code:
                    String(
                      row[
                        'code'
                      ] ?? '',
                    ).trim(),

                  description:
                    String(
                      row[
                        'description'
                      ] ?? '',
                    ).trim(),

                  barras:
                    String(
                      row[
                        'barras'
                      ] ?? '',
                    ).trim(),

                  lineName:
                    String(
                      row[
                        'linename'
                      ] ?? '',
                    ).trim(),

                  type:
                    String(
                      row[
                        'type'
                      ] ?? '',
                    ).trim(),

                  unit:
                    String(
                      row[
                        'unit'
                      ] ?? '',
                    ).trim(),

                  pesable:
                    String(
                      row[
                        'pesable'
                      ] ?? '',
                    ).trim(),

                  min:
                    this.parseNumber(
                      row['min'],
                    ),

                  max:
                    this.parseNumber(
                      row['max'],
                    ),

                  visibility:
                    this.parseInteger(
                      row[
                        'visibility'
                      ],
                    ),

                  family:
                    String(
                      row[
                        'family'
                      ] ?? '',
                    ).trim(),

                  costo:
                    this.parseNumber(
                      row[
                        'costo'
                      ],
                    ),

                  precio:
                    this.parseNumber(
                      row[
                        'precio'
                      ],
                    ),

                  partida:
                    String(
                      row[
                        'partida'
                      ] ?? '',
                    ).trim(),

                  criterio:
                    String(
                      row[
                        'criterio'
                      ] ?? '',
                    ).trim(),

                  clase:
                    String(
                      row[
                        'clase'
                      ] ?? '',
                    ).trim(),

                  tipoEgreso:
                    String(
                      row[
                        'tipo egreso'
                      ] ?? '',
                    ).trim(),
                }))
                .filter(
                  (product) =>
                    product.code !==
                    '',
                );

            // ================================================
            // VALIDAR VISIBILITY
            // ================================================

            const invalidVisibility =
              products.find(
                (product) =>
                  product.visibility !==
                    0 &&
                  product.visibility !==
                    1,
              );

            if (
              invalidVisibility
            ) {
              this.snackbar.error(
                `El producto ${invalidVisibility.code} tiene visibility inválido.`,
              );

              input.value = '';

              return;
            }

            // ================================================
            // DUPLICADOS
            // ================================================

            const codes =
              products.map(
                (product) =>
                  product.code
                    .trim()
                    .toUpperCase(),
              );

            const duplicatedCodes =
              codes.filter(
                (
                  code,
                  index,
                ) =>
                  codes.indexOf(
                    code,
                  ) !== index,
              );

            if (
              duplicatedCodes.length >
              0
            ) {
              this.snackbar.error(
                `Códigos duplicados: ${[
                  ...new Set(
                    duplicatedCodes,
                  ),
                ].join(', ')}`,
              );

              input.value = '';

              return;
            }

            if (
              products.length === 0
            ) {
              this.snackbar.error(
                'El CSV no contiene productos.',
              );

              input.value = '';

              return;
            }

            // ================================================
            // PLANCHAR CATÁLOGO
            // ================================================

            this.isImporting =
              true;

            this.productsService
              .importProducts(
                products,
              )
              .subscribe({
                next:
                  (response) => {
                    this.isImporting =
                      false;

                    this.reloadProducts();

                    this.snackbar.success(
                      `Catálogo planchado correctamente: ${response.activeProducts} productos.`,
                    );

                    input.value =
                      '';
                  },

                error:
                  (error) => {
                    this.isImporting =
                      false;

                    const backendErrors =
                      error?.error
                        ?.errors;

                    if (
                      Array.isArray(
                        backendErrors,
                      )
                    ) {
                      this.snackbar.error(
                        backendErrors.join(
                          '\n',
                        ),
                      );
                    } else {
                      this.snackbar.error(
                        error?.error
                          ?.message ??
                          'No se pudo importar el catálogo.',
                      );
                    }

                    input.value =
                      '';
                  },
              });
          },
      });
    };

    reader.readAsArrayBuffer(
      file,
    );
  }

  // ============================================================
  // EXPORT CSV
  // ============================================================

  exportCsv(): void {
    const productsToExport:
      Product[] = [];

    this.gridApi
      .forEachNodeAfterFilterAndSort(
        (node) => {
          if (node.data) {
            productsToExport.push(
              node.data as Product,
            );
          }
        },
      );

    if (
      productsToExport.length ===
      0
    ) {
      this.snackbar.error(
        'No hay productos para exportar.',
      );

      return;
    }

    const exportData =
      productsToExport.map(
        (product) => ({
          code:
            product.code ??
            '',

          description:
            product.description ??
            '',

          Barras:
            product.barras ??
            '',

          lineName:
            product.lineName ??
            '',

          type:
            product.type ??
            '',

          unit:
            product.unit ??
            '',

          Pesable:
            product.pesable ??
            '',

          min:
            product.min ??
            0,

          max:
            product.max ??
            0,

          visibility:
            product
              .isVisibleInPecal
              ? 1
              : 0,

          Family:
            product.family ??
            '',

          Costo:
            product.costo ??
            0,

          Precio:
            product.precio ??
            0,

          PARTIDA:
            product.partida ??
            '',

          CRITERIO:
            product.criterio ??
            '',

          CLASE:
            product.clase ??
            '',

          'TIPO EGRESO':
            product.tipoEgreso ??
            '',
        }),
      );

    const csv =
      Papa.unparse(
        exportData,
        {
          columns:
            this.expectedColumns,

          header: true,

          newline:
            '\r\n',

          quotes: true,
        },
      );

    const csvWithBom =
      '\uFEFF' + csv;

    const blob =
      new Blob(
        [csvWithBom],
        {
          type:
            'text/csv;charset=utf-8;',
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        'a',
      );

    const today =
      new Date();

    const date =
      `${today.getFullYear()}-` +
      `${String(
        today.getMonth() + 1,
      ).padStart(2, '0')}-` +
      `${String(
        today.getDate(),
      ).padStart(2, '0')}`;

    link.href = url;

    link.download =
      `productos_${date}.csv`;

    document.body
      .appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url,
    );

    this.snackbar.success(
      `${productsToExport.length} productos exportados correctamente.`,
    );
  }

  // ============================================================
  // TEMPLATE
  // ============================================================

  downloadTemplate(): void {
    const csvContent =
      this.expectedColumns.join(
        ',',
      ) + '\r\n';

    const blob =
      new Blob(
        [
          '\uFEFF' +
            csvContent,
        ],
        {
          type:
            'text/csv;charset=utf-8;',
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        'a',
      );

    link.href = url;

    link.download =
      'plantilla_productos.csv';

    document.body
      .appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url,
    );
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private generateNextCode(): string {
    const numericCodes =
      this.rowData
        .map((product) =>
          Number(
            product.code,
          ),
        )
        .filter(
          (code) =>
            !Number.isNaN(
              code,
            ),
        );

    const max =
      numericCodes.length
        ? Math.max(
            ...numericCodes,
          )
        : 0;

    return String(max + 1);
  }

  private codeExists(
    code: string,
  ): boolean {
    return this.rowData.some(
      (product) =>
        product.code === code,
    );
  }

  private reloadProducts(): void {
    this.productsService
      .getProducts()
      .subscribe({
        next: (data) => {
          this.rowData =
            data;
        },

        error: () => {
          this.snackbar.error(
            'No se pudo cargar el catálogo de productos.',
          );
        },
      });
  }

  private parseNumber(
    value: unknown,
  ): number {
    const text =
      String(
        value ?? '',
      )
        .trim()
        .replace(
          /\$/g,
          '',
        )
        .replace(
          /,/g,
          '',
        );

    if (!text) {
      return 0;
    }

    const parsed =
      Number(text);

    return Number.isFinite(
      parsed,
    )
      ? parsed
      : 0;
  }

  private parseInteger(
    value: unknown,
  ): number {
    const parsed =
      Number.parseInt(
        String(
          value ?? '',
        ).trim(),
        10,
      );

    return Number.isNaN(
      parsed,
    )
      ? 0
      : parsed;
  }
}