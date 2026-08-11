import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs';


export interface PendingPurchasesBySupplier {
  supplierId: number;
  supplierName: string;
  pendingCount: number;
  totalDebt: number;
  items: PendingPurchase[];
}

export interface PendingPurchase {
  purchaseId: number;
  folio: string;
  purchaseDate: string;
  dueDate: string;

  supplierName: string;

  conditions: string;
  paymentStatus: string;

  total: number;
  paidAmount: number;
  balance: number;

  nextPartialityNumber: number;

  sucursalesId?: number | null;
  sucursalName?: string | null;

  vehicleId?: number | null;
  vehicleName?: string | null;
  vehiclePlate?: string | null;

  isOverdue: boolean;
  daysToDue: number;
}

export interface CreatePurchasePaymentRequest {
  supplierId: number;
  paymentDate: string;
  paymentForm: string;
  bank?: string | null;
  reference?: string | null;
  observations?: string | null;
  items: CreatePurchasePaymentItemRequest[];
}

export interface CreatePurchasePaymentItemRequest {
  purchaseId: number;
  amountApplied: number;
}

export interface CreatePurchasePaymentResponse {
  paymentId: number;
  supplierId: number;
  supplierName: string;
  paymentDate: string;
  paymentForm: string;
  bank?: string | null;
  reference?: string | null;
  totalAmount: number;
  items: CreatePurchasePaymentItemResponse[];
}

export interface CreatePurchasePaymentItemResponse {
  purchaseId: number;
  folio: string;
  previousBalance: number;
  amountApplied: number;
  remainingBalance: number;
  partialityNumber: number;
  paymentStatus: string;
}

export interface UploadPurchasePaymentFile {
  file: File;
  category: string;
}

export interface PurchasePaymentFileResponse {
  id: number;
  purchasePaymentId: number;
  fileType: string;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface PurchasePaymentHistoryResponse {
  purchaseId: number;
  folio: string;
  total: number;
  paidAmount: number;
  balance: number;
  paymentStatus: string;
  payments: PurchasePaymentHistoryItem[];
}

export interface PurchasePaymentHistoryItem {
  paymentId: number;
  paymentDate: string;

  previousBalance: number;
  amountApplied: number;
  remainingBalance: number;

  partialityNumber: number;

  paymentForm: string;
  bank?: string | null;
  reference?: string | null;
  observations?: string | null;

  registeredBy: string;
  createdAt: string;

  isCancelled: boolean;

  files: PurchasePaymentFileResponse[];
}

export interface PurchasePaymentListQuery {
  search?: string | null;
  supplierId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  paymentForm?: string | null;
  isCancelled?: boolean | null;
  page?: number;
  pageSize?: number;
}

export interface PurchasePaymentListResponse {
  items: PurchasePaymentListItem[];
  page: number;
  pageSize: number;
  total: number;
  
}

export interface PurchasePaymentListItem {
  paymentId: number;
  supplierId: number;
  supplierName: string;
  paymentDate: string;
  paymentForm: string;
  bank?: string | null;
  reference?: string | null;
  totalAmount: number;
  observations?: string | null;
  createdByUserId: number;
  createdByUserName: string;
  createdAt: string;
  isCancelled: boolean;
  purchasesCount: number;
  filesCount: number;
  isLiquidated: boolean;
  
}

export interface PurchasePaymentDetail {
  paymentId: number;
  supplierId: number;
  supplierName: string;
  paymentDate: string;
  paymentForm: string;
  bank?: string | null;
  reference?: string | null;
  totalAmount: number;
  observations?: string | null;
  createdByUserId: number;
  createdByUserName: string;
  createdAt: string;
  isCancelled: boolean;
  isLiquidated: boolean;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  items: PurchasePaymentDetailItem[];
  files: PurchasePaymentFileResponse[];
}

export interface PurchasePaymentDetailItem {
  purchaseId: number;
  folio: string;
  purchaseDate: string;
  dueDate: string;
  previousBalance: number;
  amountApplied: number;
  remainingBalance: number;
  partialityNumber: number;
  paymentStatus: string;
}

@Injectable({
  providedIn: 'root',
})
export class PurchasePaymentsService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/purchase-payments`;

  getPendingBySupplier(supplierId: number) {
    const params = new HttpParams().set('supplierId', supplierId);

    return this.http.get<PendingPurchasesBySupplier>(`${this.apiUrl}/pending`, {
      params,
    });
  }

  createPayment(request: CreatePurchasePaymentRequest) {
    return this.http.post<CreatePurchasePaymentResponse>(this.apiUrl, request);
  }

  uploadPaymentFiles(paymentId: number, files: UploadPurchasePaymentFile[]) {
    const formData = new FormData();

    files.forEach((item) => {
      formData.append('files', item.file);
      formData.append('categories', item.category);
    });

    return this.http.post<PurchasePaymentFileResponse[]>(
      `${this.apiUrl}/${paymentId}/files`,
      formData,
    );
  }

  getPaymentHistoryByPurchase(purchaseId: number) {
    return this.http.get<PurchasePaymentHistoryResponse>(
      `${this.apiUrl}/purchase/${purchaseId}/history`,
    );
  }

  getPaymentsHistory(query: PurchasePaymentListQuery) {
    let params = new HttpParams();

    if (query.search) {
      params = params.set('search', query.search);
    }

    if (query.supplierId) {
      params = params.set('supplierId', query.supplierId);
    }

    if (query.dateFrom) {
      params = params.set('dateFrom', query.dateFrom);
    }

    if (query.dateTo) {
      params = params.set('dateTo', query.dateTo);
    }

    if (query.paymentForm) {
      params = params.set('paymentForm', query.paymentForm);
    }

    if (query.isCancelled !== null && query.isCancelled !== undefined) {
      params = params.set('isCancelled', query.isCancelled);
    }

    params = params
      .set('page', query.page || 1)
      .set('pageSize', query.pageSize || 20);

    return this.http.get<PurchasePaymentListResponse>(
      `${this.apiUrl}/history`,
      { params },
    );
  }

  getPaymentDetail(paymentId: number) {
    return this.http.get<PurchasePaymentDetail>(`${this.apiUrl}/${paymentId}`);
  }

  downloadPaymentFile(fileId: number) {
    return this.http.get(`${this.apiUrl}/files/${fileId}/download`, {
      responseType: 'blob',
    });
  }

  getPaymentFiles(paymentId: number) {
    return this.getPaymentDetail(paymentId).pipe(
      map((detail) => detail.files || []),
    );
  }

}
