export interface OrderPickingItem {
  productId: number;

  productDescription: string;

  lineName: string;

  requestedQty: number;

  totalDispatched: number;

  pendingQty: number;

  isOutOfStock: boolean;

  totalReceived : number;

  pendingOperationalQty: number;

  confirmedQty: number;

  sentOperationalQty: number;

  hasConfirmedMissing: number;

}
