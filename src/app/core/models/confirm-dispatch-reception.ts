export interface ConfirmDispatchReceptionDto {
  items: ConfirmDispatchProductDto[];
}

export interface ConfirmDispatchProductDto {
  productId: number;
  receivedQty: number;
}
