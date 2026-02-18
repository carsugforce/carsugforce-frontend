export interface PecalOrderItem {
  productId: number;
  productDescription: string;
  lineId: number;
  unit: string;
  qty: number;
  min: number;
  max: number;
  observations?: string | null;
}
