import { PecalOrderStatus } from './pecal-order-status';

export interface PecalOrderDetail {
  id: number;
  orderNumber: string;
  status: PecalOrderStatus;

  createdAt: string;

  sentAt?: string | null;
  openAt?: string | null;
  partialAt?: string | null;
  completeAt?: string | null;
  closedAt?: string | null;

  totalItems: number;
  totalLines: number;

  startDispatching: number;


  totalKG: number;
  totalPZ: number;
  
  pendingDispatchesCount: number;



}
