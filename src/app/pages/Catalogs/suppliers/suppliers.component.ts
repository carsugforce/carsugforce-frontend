import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { MatDialog } from '@angular/material/dialog';

import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SnackbarService } from '../../../core/service/snackbar.service';

import { SuppliersFormComponent } from '../../../modals/credi-suppliers/suppliers-form.component';
import { Suppliers } from '../../../core/models/suppliers.model';
import { SuppliersService } from '../../../core/service/suppliers.service';
import { SupplierActionsRendererComponent } from './suppliers-actions-renderer.component';
import Papa from 'papaparse';

interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

@Component({
  standalone: true,
  selector: 'app-suppliers',
  imports: [
    CommonModule,
    AgGridAngular
  ],
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.scss']
})
export class SuppliersComponent implements OnInit {

  constructor(
    private suppliersService: SuppliersService,
    private dialog: MatDialog,
    private snackbar: SnackbarService
  ) {}

  @ViewChild('fileInput') fileInput!: ElementRef;

  private gridApi!: GridApi;

  rowData: Suppliers[] = [];
  isImporting = false;

  colDefs: ColDef[] = [
    { field: 'vialidad', hide: true },
    { field: 'street', hide: true },
    { field: 'externalNumber', hide: true },
    { field: 'internalNumber', hide: true },
    { field: 'neighborhood', hide: true },
    { field: 'zipCode', hide: true },
    { field: 'municipality', hide: true },
    { field: 'state', hide: true },

    { field: 'rfc', headerName: 'RFC', width: 150 },
    { field: 'name', headerName: 'Nombre', flex: 1, minWidth: 260 },
    { field: 'phone', headerName: 'Teléfono', width: 150 },
    { field: 'email', headerName: 'Email', width: 220 },
    { field: 'paymentCondition', headerName: 'Condiciones', width: 130 },
    { field: 'fiscalRegime', headerName: 'Régimen', width: 100 },
    { field: 'paymentForm', headerName: 'Forma', width: 90 },
    { field: 'cfdiUse', headerName: 'Uso', width: 90 },
    { field: 'paymentMethod', headerName: 'Método', width: 100 },
    { field: 'creditDays', headerName: 'Días Crédito', width: 120, cellClass: 'text-right' },

    {
      headerName: 'Acciones',
      width: 110,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: SupplierActionsRendererComponent
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
    'rfc',
    'name',
    'vialidad',
    'street',
    'externalNumber',
    'internalNumber',
    'neighborhood',
    'zipCode',
    'municipality',
    'state',
    'phone',
    'email',
    'paymentCondition',
    'fiscalRegime',
    'paymentForm',
    'cfdiUse',
    'paymentMethod',
    'creditDays'
  ];

  ngOnInit(): void {
    this.reloadSuppliers();
  }

 onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
  }



  onQuickFilterChanged(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.gridApi.setGridOption('quickFilterText', value);
  }

  openCreateSupplier(): void {
    const dialogRef = this.dialog.open(SuppliersFormComponent, {
      width: '900px',
      disableClose: true,
      data: {
        mode: 'create'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.suppliersService.createSupplier(result).subscribe({
        next: () => {
          this.reloadSuppliers();

          this.dialog.open(ConfirmDialogComponent, {
            width: '350px',
            data: {
              type: 'success',
              title: 'Proveedor creado',
              message: 'El proveedor fue guardado correctamente.',
              confirmText: 'Aceptar'
            }
          });
        },
        error: (err) => {
          this.dialog.open(ConfirmDialogComponent, {
            width: '380px',
            data: {
              type: 'error',
              title: 'Error',
              message: err?.error || 'No se pudo guardar el proveedor.',
              confirmText: 'Aceptar'
            }
          });
        }
      });
    });
  }

  openEditSupplier(supplier: Suppliers): void {
    const dialogRef = this.dialog.open(SuppliersFormComponent, {
      width: '900px',
      disableClose: true,
      data: {
        mode: 'edit',
        supplier
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.suppliersService.updateSupplier(supplier.id, result).subscribe({
        next: () => {
          this.reloadSuppliers();

          this.dialog.open(ConfirmDialogComponent, {
            width: '350px',
            data: {
              type: 'success',
              title: 'Proveedor actualizado',
              message: 'El proveedor fue actualizado correctamente.',
              confirmText: 'Aceptar'
            }
          });
        },
        error: (err) => {
          this.dialog.open(ConfirmDialogComponent, {
            width: '380px',
            data: {
              type: 'error',
              title: 'Error',
              message: err?.error || 'No se pudo actualizar el proveedor.',
              confirmText: 'Aceptar'
            }
          });
        }
      });
    });
  }

  confirmDeleteSupplier(supplier: Suppliers): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        type: 'warning',
        title: 'Eliminar proveedor',
        message: `¿Seguro que deseas eliminar el proveedor "${supplier.name}"?`,
        showCancel: true,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    ref.afterClosed().subscribe(ok => {
      if (!ok) return;

      this.suppliersService.deleteSupplier(supplier.id).subscribe({
        next: () => {
          this.gridApi.applyTransaction({ remove: [supplier] });
        },
        error: () => {
          this.snackbar.error('No se pudo eliminar el proveedor.');
        }
      });
    });
  }

  private reloadSuppliers(): void {
  this.suppliersService.getSuppliers().subscribe({
    next: (res) => {
      this.rowData = res.items ?? [];

      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', this.rowData);
      }
    },
    error: () => {
      this.rowData = [];
      this.snackbar.error('No se pudieron cargar los proveedores.');
    }
  });
}

  exportCsv(): void {
    this.gridApi.exportDataAsCsv({
      fileName: 'proveedores.csv',
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
    link.setAttribute('download', 'plantilla_proveedores.csv');

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

        // ESTE ARCHIVO VIENE EN ANSI / WINDOWS-1252
        let text = new TextDecoder('windows-1252').decode(buffer);

        // quitar BOM si viene
        text = text.replace(/^\uFEFF/, '').normalize('NFC');

        console.log('Texto decodificado muestra:', text.includes('CARROCERÍA') ? 'OK' : 'NO OK');

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const headers = (result.meta.fields ?? []).map(h => h.trim());

          const missingColumns = this.expectedColumns.filter(
            col => !headers.includes(col)
          );

          if (missingColumns.length > 0) {
            this.snackbar.error(
              `El CSV no tiene las columnas correctas. Faltan: ${missingColumns.join(', ')}`
            );
            event.target.value = '';
            return;
          }

          const data = (result.data as any[])
            .map(row => ({
              rfc: (row.rfc ?? '').trim(),
              name: (row.name ?? '').trim(),
              vialidad: (row.vialidad ?? '').trim(),
              street: (row.street ?? '').trim(),
              externalNumber: (row.externalNumber ?? '').trim(),
              internalNumber: (row.internalNumber ?? '').trim(),
              neighborhood: (row.neighborhood ?? '').trim(),
              zipCode: (row.zipCode ?? '').trim(),
              municipality: (row.municipality ?? '').trim(),
              state: (row.state ?? '').trim(),
              phone: (row.phone ?? '').trim(),
              email: (row.email ?? '').trim(),
              paymentCondition: (row.paymentCondition ?? '').trim(),
              fiscalRegime: (row.fiscalRegime ?? '').trim(),
              paymentForm: (row.paymentForm ?? '').trim(),
              cfdiUse: (row.cfdiUse ?? '').trim(),
              paymentMethod: (row.paymentMethod ?? '').trim(),
              creditDays: parseInt((row.creditDays ?? '0').toString().trim(), 10) || 0
            }))
            .filter(row => Object.values(row).some(v => `${v}`.trim() !== ''));

          this.isImporting = true;

          this.suppliersService.importSuppliers(data).subscribe({
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
                `Importación completada. ${res.created} proveedores creados, ${res.updated} proveedores actualizados`
              );

              this.reloadSuppliers();
            },
            error: (err: any) => {
              this.isImporting = false;

              if (err.error?.errors) {
                const messages = err.error.errors;
                this.snackbar.error(
                  Array.isArray(messages)
                    ? messages.join('\n')
                    : 'Error al importar el archivo.'
                );
              } else if (typeof err.error === 'string') {
                this.snackbar.error(err.error);
              } else {
                this.snackbar.error('Error al importar el archivo.');
              }
            }
          });

          event.target.value = '';
        },
        error: () => {
          this.snackbar.error('No se pudo leer el archivo CSV.');
          event.target.value = '';
        }
      });
    };

    reader.onerror = () => {
      this.snackbar.error('No se pudo leer el archivo.');
      event.target.value = '';
    };

    reader.readAsArrayBuffer(file);
  }
}