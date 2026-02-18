export interface DispatchSummaryItem {
  productId: number;
  producto: string;
  solicitado: number;
  enviado: number;
  pendiente: number;
  desabasto: boolean | null;
}
