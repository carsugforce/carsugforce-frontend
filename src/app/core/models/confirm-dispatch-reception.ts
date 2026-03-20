export interface ConfirmDispatchReceptionDto {
  items: ConfirmDispatchProductDto[];
  note?: string | null;
}

export interface ConfirmDispatchProductDto {
  productId: number;
  receivedQty: number;
}
