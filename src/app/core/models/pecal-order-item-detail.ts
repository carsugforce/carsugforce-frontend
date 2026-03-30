export interface PecalOrderItemDetail {
  productId: number;
  productDescription: string;
  unit: string;
  qty: number;
  observations?: string | null;
  pendingQty: number;
  confirmQty : number;
  isOutOfStock: boolean;
}

export interface PecalOrderLine {
  line: string;
  items: PecalOrderItemDetail[];
}

export interface PecalOrderFamily {
  family: string;
  lines: PecalOrderLine[];
}