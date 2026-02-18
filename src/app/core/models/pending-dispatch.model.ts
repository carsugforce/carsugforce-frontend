export interface PendingDispatch {
  id: number;
  dispatchNumber: number;
  dispatchWindow: string;
  startedAt: string;
  closedAt: string | null;
  status: 'Open' | 'Closed';
}
