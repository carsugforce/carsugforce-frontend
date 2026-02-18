// models/dispatch-history.model.ts

export interface DispatchHistoryItem {
  productId : number;
  dispatchNumber: number;
  startedAt: string;
  closedAt?: string | null;

  dispatchWindow: string;
  status: 'Open' | 'Closed';

  dispatchedBy: string;

  items: DispatchHistoryProduct[];
}

export interface DispatchHistoryProduct {
  productId: number;
  productName: string;
  qty: number;
  unit: string;
  isOutOfStock: boolean;
  requestedQty: number;
  totalDispatched : number;
  observations:string;
  qtyBefore: number;
  qtyAfter: number;
  missingQty: number;
  sentQty: number;
  receivedQty: number;
}


export interface AddMissingHistoryItem {
  productId: number;
  productName: string;
  qtyBefore: number;
  qtyAfter: number;
  unit: string;
}
