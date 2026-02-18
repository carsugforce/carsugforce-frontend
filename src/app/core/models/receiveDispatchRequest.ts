import { ReceiveDispatchItemDto } from "./receiveDispatchItem";

export interface ReceiveDispatchRequestDto {
  orderId: number;
  dispatchId: number;

  items: ReceiveDispatchItemDto[];

 
  leavePending: boolean;

  generalNotes?: string;
}
