import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ProductsService } from '../../core/service/products.service';
import {
  ProductDraftState,
  ProductLineDraftState,
  PurchaseProductDraftService
} from '../../core/service/purchase-product-draft.service';

export interface ProductDialogItem {
  id: number;
  code?: string;
  description: string;
  unit?: string;
  lineName?: string;
  familyName?: string;
  lastUnitPrice?: number;
  lines: ProductLineDraftState[];
}

export interface ProductSelectedResult {
  productId: number;
  code?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  ivaRate: number;
}

@Component({
  selector: 'app-product-multi-select-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './product-multi-select-dialog.component.html',
  styleUrl: './product-multi-select-dialog.component.scss'
})
export class ProductMultiSelectDialogComponent implements OnInit {
  private productsService = inject(ProductsService);
  private dialogRef = inject(MatDialogRef<ProductMultiSelectDialogComponent>);
  private draftService = inject(PurchaseProductDraftService);

  searchCtrl = new FormControl('');

  products: ProductDialogItem[] = [];
  filteredProducts: ProductDialogItem[] = [];
  loading = false;

  showPurchaseOnly = false;
  showDraftOnly = false;

  private shouldPersistOnClose = true;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { selectedIds?: number[] } | null
  ) {
    this.dialogRef.beforeClosed().subscribe(() => {
      if (this.shouldPersistOnClose) {
        this.saveDraftSnapshot();
      }
    });
  }

  ngOnInit(): void {
    this.loadProducts();

    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(150),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.applyFilters();
      });
  }

  trackByProduct(_: number, product: ProductDialogItem): number {
    return product.id;
  }

  trackByLine(_: number, line: ProductLineDraftState): string {
    return line.id;
  }

  get purchaseLineCount(): number {
    return this.data?.selectedIds?.length ?? 0;
  }

  get currentSelectionCount(): number {
    return this.products.reduce((acc, product) => acc + product.lines.length, 0);
  }

  get isShowingAllProducts(): boolean {
    const term = (this.searchCtrl.value ?? '').trim();
    return !this.showPurchaseOnly && !this.showDraftOnly && !term;
  }

  loadProducts(): void {
    this.loading = true;

    this.productsService.getProducts()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res: any) => {
          const source = res?.items ?? res ?? [];
          const savedDraft = this.draftService.getDraft();

          this.products = source.map((x: any) => ({
            id: x.id,
            code: x.code,
            description: x.description,
            unit: x.unit || 'PZ',
            lineName: x.lineName,
            familyName: x.familyName,
            lastUnitPrice: Number(x.lastUnitPrice ?? x.lastPrice ?? x.unitPrice ?? 0),
            lines: savedDraft[x.id] ? savedDraft[x.id].map(line => ({ ...line })) : []
          }));

          this.applyFilters();
        },
        error: () => {
          this.products = [];
          this.filteredProducts = [];
        }
      });
  }

  private createDefaultLine(product: ProductDialogItem): ProductLineDraftState {
    return {
      id: this.generateLineId(),
      quantity: 1,
      unitPrice: Number(product.lastUnitPrice ?? 0),
      quantityTouched: false
    };
  }

  private generateLineId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private saveDraftSnapshot(): void {
    const draft: ProductDraftState = {};

    this.products.forEach(product => {
      if (product.lines.length > 0) {
        draft[product.id] = product.lines.map(line => ({ ...line }));
      }
    });

    this.draftService.setDraft(draft);
  }

  private normalizeActiveFilters(): void {
    if (this.purchaseLineCount === 0) {
      this.showPurchaseOnly = false;
    }

    if (this.currentSelectionCount === 0) {
      this.showDraftOnly = false;
    }
  }

  showAllProducts(): void {
    this.showPurchaseOnly = false;
    this.showDraftOnly = false;
    this.searchCtrl.setValue('', { emitEvent: false });
    this.applyFilters();
  }

  togglePurchaseFilter(): void {
    if (this.purchaseLineCount === 0) return;

    this.showPurchaseOnly = !this.showPurchaseOnly;

    if (this.showPurchaseOnly) {
      this.showDraftOnly = false;
    }

    this.applyFilters();
  }

  toggleDraftFilter(): void {
    if (this.currentSelectionCount === 0) return;

    this.showDraftOnly = !this.showDraftOnly;

    if (this.showDraftOnly) {
      this.showPurchaseOnly = false;
    }

    this.applyFilters();
  }

  private applyFilters(): void {
    this.normalizeActiveFilters();

    const term = (this.searchCtrl.value ?? '').trim().toLowerCase();
    let list = [...this.products];

    if (this.showPurchaseOnly) {
      list = list.filter(p => this.isInPurchase(p.id));
    } else if (this.showDraftOnly) {
      list = list.filter(p => this.isSelected(p));
    }

    if (term) {
      list = list.filter(p => {
        const text = [
          p.code,
          p.description,
          p.unit,
          p.lineName,
          p.familyName
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return text.includes(term);
      });
    }

    this.filteredProducts = list;
  }

  toggleProduct(product: ProductDialogItem): void {
    if (this.isSelected(product)) {
      product.lines.length = 0;
    } else {
      product.lines.push(this.createDefaultLine(product));
    }

    this.saveDraftSnapshot();
    this.applyFilters();
  }

  isSelected(product: ProductDialogItem): boolean {
    return product.lines.length > 0;
  }

  isInPurchase(productId: number): boolean {
    return this.getPurchaseOccurrences(productId) > 0;
  }

  getPurchaseOccurrences(productId: number): number {
    return (this.data?.selectedIds ?? []).filter(id => id === productId).length;
  }

  getLineIndex(product: ProductDialogItem, lineId: string): number {
    return product.lines.findIndex(x => x.id === lineId);
  }

  addLine(product: ProductDialogItem, event: Event): void {
    event.stopPropagation();

    if (!this.canAddNewLine(product)) return;

    product.lines.push(this.createDefaultLine(product));
    this.saveDraftSnapshot();
  }

  removeLine(product: ProductDialogItem, lineId: string, event: Event): void {
    event.stopPropagation();

    const index = product.lines.findIndex(x => x.id === lineId);
    if (index >= 0) {
      product.lines.splice(index, 1);
    }

    this.saveDraftSnapshot();
    this.applyFilters();
  }

  updateLineQuantity(product: ProductDialogItem, lineId: string, value: string): void {
    const parsed = Number(value);
    const line = product.lines.find(x => x.id === lineId);

    if (!line) return;

    line.quantity = !isNaN(parsed) && parsed > 0 ? parsed : 0;
    line.quantityTouched = true;

    this.saveDraftSnapshot();
  }

  updateLineUnitPrice(product: ProductDialogItem, lineId: string, value: string): void {
    const parsed = Number(value);
    const line = product.lines.find(x => x.id === lineId);

    if (!line) return;

    line.unitPrice = !isNaN(parsed) && parsed >= 0 ? parsed : 0;
    this.saveDraftSnapshot();
  }

  private isLineValid(line: ProductLineDraftState): boolean {
    return Number(line.quantity) > 0;
  }

  canAddNewLine(product: ProductDialogItem): boolean {
    if (!this.isSelected(product)) return false;
    if (product.lines.length === 0) return true;

    const lastLine = product.lines[product.lines.length - 1];
    return this.isLineValid(lastLine) && lastLine.quantityTouched;
  }

  get canConfirm(): boolean {
    const allLines = this.products.flatMap(product => product.lines);

    if (allLines.length === 0) return false;

    return allLines.every(line => this.isLineValid(line));
  }

  confirmSelection(): void {
    const selected: ProductSelectedResult[] = this.products.flatMap(product =>
      product.lines.map(line => ({
        productId: product.id,
        code: product.code,
        description: product.description,
        unit: product.unit || 'PZ',
        quantity: Number(line.quantity || 0),
        unitPrice: Number(line.unitPrice || 0),
        ivaRate: 0
      }))
    );

    this.shouldPersistOnClose = false;
    this.draftService.clearDraft();
    this.dialogRef.close(selected);
  }

  close(): void {
    this.dialogRef.close([]);
  }
}