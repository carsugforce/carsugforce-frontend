import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';

import { Product } from '../../../core/models/product.models';
import { ProductsService } from '../../../core/service/products.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  standalone: true,
  selector: 'app-product-actions-renderer',
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="grid-actions">
      <button
        type="button"
        class="visibility-toggle"
        [class.visible]="isVisibleInPecal"
        [class.hidden]="!isVisibleInPecal"
        [disabled]="isSaving"
        [title]="
          isVisibleInPecal
            ? 'Ocultar producto en PECAL'
            : 'Mostrar producto en PECAL'
        "
        (click)="togglePecalVisibility()"
      >
        <mat-icon>
          {{ isVisibleInPecal ? 'visibility' : 'visibility_off' }}
        </mat-icon>

        <span>
          {{
            isSaving
              ? 'Guardando...'
              : isVisibleInPecal
                ? 'Mostrando'
                : 'Oculto'
          }}
        </span>
      </button>

      <button
        type="button"
        class="grid-icon edit"
        title="Editar producto"
        (click)="edit()"
      >
        <mat-icon>edit</mat-icon>
      </button>

      <button
        type="button"
        class="grid-icon delete"
        title="Eliminar producto"
        (click)="delete()"
      >
        <mat-icon>delete</mat-icon>
      </button>
    </div>
  `,
  styles: [
    `
      .grid-actions {
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
      }

      .visibility-toggle {
        min-width: 120px;
        height: 32px;
        padding: 0 12px;
        border-radius: 18px;
        border: 1px solid transparent;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition:
          background-color 0.2s ease,
          border-color 0.2s ease,
          color 0.2s ease,
          opacity 0.2s ease;
      }

      .visibility-toggle mat-icon {
        width: 18px;
        height: 18px;
        font-size: 18px;
        line-height: 18px;
      }

      .visibility-toggle.visible {
        color: #166534;
        background-color: rgba(34, 197, 94, 0.12);
        border-color: rgba(34, 197, 94, 0.35);
      }

      .visibility-toggle.visible:hover {
        background-color: rgba(34, 197, 94, 0.22);
      }

      .visibility-toggle.hidden {
        color: #991b1b;
        background-color: rgba(239, 68, 68, 0.12);
        border-color: rgba(239, 68, 68, 0.35);
      }

      .visibility-toggle.hidden:hover {
        background-color: rgba(239, 68, 68, 0.22);
      }

      .visibility-toggle:disabled {
        cursor: wait;
        opacity: 0.65;
      }

      .grid-icon {
        width: 34px;
        height: 34px;
        padding: 4px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: #9ca3af;
        cursor: pointer;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        transition:
          background-color 0.2s ease,
          color 0.2s ease;
      }

      .grid-icon:hover {
        color: #881137;
        background-color: rgba(82, 78, 79, 0.2);
      }

      .grid-icon mat-icon {
        width: 24px;
        height: 24px;
        font-size: 24px;
        line-height: 24px;
      }
    `,
  ],
})
export class ProductActionsRendererComponent implements ICellRendererAngularComp {
  private params: any;

  isSaving = false;

  constructor(
    private productsService: ProductsService,
    private snackbar: SnackbarService,
  ) {}

  agInit(params: any): void {
    this.params = params;
  }

  refresh(params: any): boolean {
    this.params = params;
    return true;
  }

  get isVisibleInPecal(): boolean {
    return this.params?.data?.isVisibleInPecal !== false;
  }

  togglePecalVisibility(): void {
    if (this.isSaving) {
      return;
    }

    const product = this.params.data as Product;

    const newVisibility = !this.isVisibleInPecal;

    this.isSaving = true;

    this.productsService
      .updatePecalVisibility(product.id, newVisibility)
      .subscribe({
        next: () => {
          product.isVisibleInPecal = newVisibility;

          this.isSaving = false;

          // Refresca visualmente la celda.
          this.params.api.refreshCells({
            rowNodes: [this.params.node],
            force: true,
          });

          // Vuelve a evaluar el filtro de Mostrando/Oculto.
          this.params.api.onFilterChanged();

          if (newVisibility) {
            this.snackbar.success(
              `"${product.description}" ahora se muestra en PECAL.`,
            );
          } else {
            this.snackbar.success(
              `"${product.description}" ahora está oculto en PECAL.`,
            );
          }
        },
        error: () => {
          this.isSaving = false;

          this.snackbar.error(
            'No se pudo actualizar la visibilidad del producto.',
          );
        },
      });
  }

  edit(): void {
    this.params.context.componentParent.openEditProduct(this.params.data);
  }

  delete(): void {
    this.params.context.componentParent.confirmDelete(this.params.data);
  }
}
