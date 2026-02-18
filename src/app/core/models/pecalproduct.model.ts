export interface PecalProduct {
  id: number;
  description: string;
  lineId: number;
  lineName: string;
  unit: string;
  min: number;
  max: number;

  qty: number;
  committedQty: number;
  overMaxConfirmed?: boolean;
  _draftQty?: number;
  observations?: string;
  isOutOfStock ?: boolean;
  addQty : number;
  pendingQty : number;
}
