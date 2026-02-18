export interface PecalOrderItemDetail {
  productId: number;
  productDescription: string;
  unit: string;
  qty: number;
  observations?: string | null;
  pendingQty: number;
  confirmQty : number;
}

export interface PecalOrderLine {
  line: string;
  items: PecalOrderItemDetail[];
}

export interface PecalOrderFamily {
  family: string;
  lines: PecalOrderLine[];
}