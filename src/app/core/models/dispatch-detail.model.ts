export interface DispatchDetailResponse {
  dispatchId: number;
  dispatchNumber: number;
  dispatchWindow: string;
  status: string;
  closedAt: string;

  orderId: number;
  orderNumber: string;
  orderStatus: string;

  sucursalId: number;
  sucursalName: string;

  families: DispatchFamilyDto[];
}

export interface DispatchFamilyDto {
  family: string;
  lines: DispatchLineDto[];
}

export interface DispatchLineDto {
  line: string;
  items: DispatchProductDto[];
}

export interface DispatchProductDto {
  productId: number;
  productDescription: string;
  unit: string;

  dispatchedQty: number;
  receivedQty: number;

  sentqty: number;
  _editing: boolean;
}
