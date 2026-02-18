import { PecalOrderStatus } from "./pecal-order-status";

export interface PecalOrderList {
  id: number;
  orderNumber: string;

  status: PecalOrderStatus;

  createdAt: string;   // ISO string
  sentAt?: string | null;
  openAt?: string | null;
  completeAt?: string | null;
  partialAt?: string | null;
  closedAt?: string | null;

  totalItems: number;
  totalLines: number;
  dispatchCount?: number;

  pendingDispatchesCount: number;
  hasPendingReception: boolean;
  startDispatch: number;

  totalKG: number;
  totalPZ: number;

  wasEdited: boolean; 
}
