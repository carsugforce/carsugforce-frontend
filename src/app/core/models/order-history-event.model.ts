import { DispatchHistoryProduct } from "./dispatch-history.model";

export interface OrderHistoryEvent {
  type: 'DISPATCH' | 'EDITED'| 'ADD_MISSING' |'CREATED' | 'RECEPTION';

  startedAt: string;
  createdBy: string;

  // SOLO si aplica
  dispatchNumber?: number;
  items?: DispatchHistoryProduct[] ;
  _expanded?: boolean;
  diff?: {
    notesBefore?: string;
    notesAfter?: string;
    itemsAdded?: any[];
    itemsRemoved?: any[];
    itemsUpdated?: any[];
  };
   _open?: boolean;
 
}


interface EditDiff {
  notesBefore?: string;
  notesAfter?: string;
  added: DiffItem[];
  removed: DiffItem[];
  updated: DiffItem[];
  summary?: string;
}

interface DiffItem {
  productId: number;
  productName: string;
  qtyBefore?: number | null;
  qtyAfter?: number | null;
}