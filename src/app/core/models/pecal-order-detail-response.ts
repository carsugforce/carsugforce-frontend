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
  createdBy: string; 

  families: PecalOrderFamily[];
  notes?: string | null;
  totalKG: number;
  totalPZ: number;

}


