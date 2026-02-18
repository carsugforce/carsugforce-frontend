export interface ReceiveDispatchItemDto {
  productId: number;

  // Lo que almacén dijo que mandó
  dispatchedQty: number;

  // Lo que sucursal confirma que recibió
  receivedQty: number;

  difference: number; // received - dispatched

  notes?: string;
}
