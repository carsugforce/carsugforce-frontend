import { Injectable } from '@angular/core';

export interface ProductLineDraftState {
  id: string;
  quantity: number;
  unitPrice: number;
  quantityTouched: boolean;
}

export type ProductDraftState = Record<number, ProductLineDraftState[]>;

@Injectable({
  providedIn: 'root'
})
export class PurchaseProductDraftService {
  private draft: ProductDraftState = {};

  getDraft(): ProductDraftState {
    return this.clone(this.draft);
  }

  setDraft(draft: ProductDraftState): void {
    this.draft = this.clone(draft);
  }

  clearDraft(): void {
    this.draft = {};
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }
}