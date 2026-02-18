import { PecalOrderFamily } from './pecal-order-item-detail';

export interface PecalOrderDetailResponse {
  orderId: number;

  sucursalId?: number;
  sucursalName?: string;

  createdAt: string;
  sentAt?: string | null;
  openAt?: string | null;
  partialAt?: string | null;
  completeAt?: string | null;
  closedAt?: string | null;
  DraftAt?: string | null;
  startDispatching: number;

  families: PecalOrderFamily[];

  totalKG: number;
  totalPZ: number;

}


