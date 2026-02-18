// models/pecal-order-edit.model.ts
export interface PecalOrderEdit {
  orderId: number;
  orderNumber: string;
  notes?: string;
  items: PecalOrderEditItem[];
}

export interface PecalOrderEditItem {
  productId: number;
  qty: number;
  observations?: string;
}
