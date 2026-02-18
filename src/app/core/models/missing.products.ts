export interface ShowMissingProductsData {
  orderId: number;
  items: MissingSourceItem[];
  pendingDispatch: number;
}

export interface MissingSourceItem {
  productId: number;
  productDescription: string;
  requestedQty: number;
  pendingQty: number;
  isOutOfStock: boolean;
  family: string;
  lineName: string;
}

export interface FamilyVM {
  family: string;
  lines: LineVM[];
}

export interface LineVM {
  line: string;
  items: MissingItemVM[];
}

export interface MissingItemVM {
  productId: number;
  producto: string;
  solicitado: number;
  pendiente: number;
  desabasto: boolean;
}