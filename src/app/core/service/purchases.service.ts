import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PurchasePaymentFileResponse } from './purchase-payments.service';

/* ============================
   CATALOG OPTIONS
============================ */

export interface PurchaseSucursalOption {
  id: number;
  description: string;
}

export interface PurchaseVehicleOption {
  id: number;
  code: string;
  name: string;
  plate?: string | null;
  displayName: string;
}

/* ============================
   CREATE PURCHASE
============================ */

export interface CreatePurchaseItemPayload {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchasePayload {
  folio?: string | null;
  purchaseDate: string;
  dueDate: string;
  conditions: string;
  voucherType: string;
  reference?: string | null;

  // UEN = Sucursales
  sucursalesId?: number | null;

  // Vehículo opcional
  vehicleId?: number | null;

  supplierId: number;
  observations?: string | null;
  paymentForm?: string | null;
  bank?: string | null;
  paymentReference?: string | null;
  items: CreatePurchaseItemPayload[];
}

export interface CreatePurchaseResponse {
  purchaseId: number;
  folio: string;
  total: number;
}

/* ============================
   UPDATE PURCHASE
============================ */

export interface UpdatePurchaseItemPayload {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface UpdatePurchasePayload {
  purchaseDate: string;
  dueDate: string;
  conditions: string;
  voucherType: string;
  reference?: string | null;

  // UEN = Sucursales
  sucursalesId?: number | null;

  // Vehículo opcional
  vehicleId?: number | null;

  supplierId: number;
  observations?: string | null;
  paymentForm?: string | null;
  bank?: string | null;
  paymentReference?: string | null;
  items: UpdatePurchaseItemPayload[];
}

export interface UpdatePurchaseResponse {
  purchaseId: number;
  folio: string;
  total: number;
}

/* ============================
   PURCHASE LIST
============================ */

export interface PurchaseListItem {
  id: number;
  folio: string;
  purchaseDate: string;
  dueDate: string;

  supplierId: number;
  supplierName: string;

  conditions: 'CONTADO' | 'CREDITO' | string;
  voucherType: string;
  paymentForm: string;
  bank?: string | null;

  total: number;
  itemsCount: number;

  createdByUserId: number;
  createdByUserName?: string | null;
  createdByUserEmail?: string | null;
  createdAt: string;

  // UEN = Sucursales
  sucursalesId?: number | null;
  sucursalName?: string | null;

  // Vehículo
  vehicleId?: number | null;
  vehicleName?: string | null;
  vehiclePlate?: string | null;
}

export interface PurchaseListQuery {
  search?: string | null;
  condition?: string | null;
  paymentForm?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;

  // filtros nuevos
  sucursalesId?: number | null;
  vehicleId?: number | null;
  createdByUserId?: number | null;

  page?: number;
  pageSize?: number;

  searchType?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/* ============================
   PURCHASE DETAIL
============================ */

export interface PurchaseDetailItem {
  id: number;
  lineNumber: number;
  productId: number;
  productDescription: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  iva: number;
  total: number;
}

export interface PurchaseHistoryItem {
  id: number;
  eventType: string;
  description: string;
  createdByUserId: number;
  createdAt: string;
}

export interface PurchaseDetail {
  id: number;
  folio: string;
  purchaseDate: string;
  dueDate: string;

  supplierId: number;
  supplierName: string;
  supplierRfc?: string | null;

  conditions: string;
  voucherType: string;
  reference?: string | null;

  // UEN = Sucursales
  sucursalesId?: number | null;
  sucursalName?: string | null;

  // Vehículo
  vehicleId?: number | null;
  vehicleName?: string | null;
  vehiclePlate?: string | null;

  observations?: string | null;

  paymentForm: string;
  bank?: string | null;
  paymentReference?: string | null;

  subtotal: number;
  iva: number;
  total: number;

  createdByUserId: number;
  createdAt: string;

  items: PurchaseDetailItem[];
  history: PurchaseHistoryItem[];
}
export interface PurchaseDebtDetail {
  debtTotal: number;
  suppliersCount: number;
  documentsCount: number;
  generatedAt: string;
  suppliers: PurchaseDebtSupplierGroup[];
}

export interface PurchaseDebtSupplierGroup {
  supplierId: number;
  supplierName: string;
  documentsCount: number;
  total: number;
  items: PurchaseDebtItem[];
}

export interface PurchaseDebtItem {
  purchaseId: number;
  folio: string;
  purchaseDate: string;
  dueDate: string;
  conditions: string;
  paymentForm: string;
  bank?: string | null;
  paymentReference?: string | null;
  sucursalesId?: number | null;
  sucursalName?: string | null;
  vehicleId?: number | null;
  vehicleName?: string | null;
  vehiclePlate?: string | null;
  total: number;
  daysToDue: number;
  isOverdue: boolean;
}

export interface PurchaseCopyTemplate {
  sourcePurchaseId: number;
  sourceFolio: string;

  supplierId: number;
  supplierName: string;

  purchaseDate: string;
  dueDate: string;

  conditions: string;
  voucherType: string;
  paymentForm: string;

  bank?: string | null;
  reference?: string | null;
  paymentReference?: string | null;
  observations?: string | null;

  sucursalesId?: number | null;
  sucursalName?: string | null;

  vehicleId?: number | null;
  vehicleName?: string | null;
  vehiclePlate?: string | null;

  total: number;

  items: PurchaseCopyTemplateItem[];
}

export interface PurchaseCopyTemplateItem {
  productId: number;
  productDescription: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  lineNumber: number;
}

export interface PurchaseFile {
  id: number;
  purchaseId: number;
  fileType: string;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  contentType: string;
  sizeBytes: number;
  uploadedByUserId: number;
  uploadedAt: string;
}

/* ============================
   SERVICE
============================ */

@Injectable({
  providedIn: 'root',
})
export class PurchasesService {
  private baseUrl = `${environment.apiUrl}/purchases`;

  constructor(private http: HttpClient) {}

  createPurchase(
    payload: CreatePurchasePayload,
  ): Observable<CreatePurchaseResponse> {
    return this.http.post<CreatePurchaseResponse>(this.baseUrl, payload);
  }

  updatePurchase(
    id: number,
    payload: UpdatePurchasePayload,
  ): Observable<UpdatePurchaseResponse> {
    return this.http.put<UpdatePurchaseResponse>(
      `${this.baseUrl}/${id}`,
      payload,
    );
  }

  getPurchases(
    query: PurchaseListQuery,
  ): Observable<PagedResult<PurchaseListItem>> {
    let params = this.buildPurchaseQueryParams(query);

    params = params.set('page', String(query.page ?? 1));
    params = params.set('pageSize', String(query.pageSize ?? 20));

    return this.http.get<PagedResult<PurchaseListItem>>(this.baseUrl, {
      params,
    });
  }

  getPurchaseDetail(id: number): Observable<PurchaseDetail> {
    return this.http.get<PurchaseDetail>(`${this.baseUrl}/${id}`);
  }

  getPurchaseSucursales(): Observable<PurchaseSucursalOption[]> {
    return this.http.get<PurchaseSucursalOption[]>(
      `${this.baseUrl}/catalogs/sucursales`,
    );
  }

  getDebtTotal() {
    return this.http.get<{ debtTotal: number }>(`${this.baseUrl}/debt-total`);
  }

  getPurchaseVehicles(): Observable<PurchaseVehicleOption[]> {
    return this.http.get<PurchaseVehicleOption[]>(
      `${this.baseUrl}/catalogs/vehicles`,
    );
  }

  downloadPurchasesPdf(query: PurchaseListQuery): Observable<Blob> {
    const params = this.buildPurchaseQueryParams(query);

    return this.http.get(`${this.baseUrl}/reports/purchases-pdf`, {
      params,
      responseType: 'blob',
    });
  }

  downloadAccountsPayablePdf(query: PurchaseListQuery): Observable<Blob> {
    const params = this.buildPurchaseQueryParams(query);

    return this.http.get(`${this.baseUrl}/reports/accounts-payable-pdf`, {
      params,
      responseType: 'blob',
    });
  }

  getDebtDetail() {
    return this.http.get<PurchaseDebtDetail>(`${this.baseUrl}/debt-detail`);
  }

  downloadPurchaseTicket(id: number) {
    return this.http.get(`${this.baseUrl}/${id}/ticket`, {
      responseType: 'blob',
    });
  }

  getCopyTemplate(id: number) {
    return this.http.get<PurchaseCopyTemplate>(
      `${this.baseUrl}/${id}/copy-template`,
    );
  }

  getPurchaseFiles(purchaseId: number): Observable<PurchaseFile[]> {
    return this.http.get<PurchaseFile[]>(`${this.baseUrl}/${purchaseId}/files`);
  }

  uploadPurchaseFiles(
    purchaseId: number,
    files: File[],
    categories: string[],
  ): Observable<PurchaseFile[]> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    categories.forEach((category) => {
      formData.append('categories', category);
    });

    return this.http.post<PurchaseFile[]>(
      `${this.baseUrl}/${purchaseId}/files`,
      formData,
    );
  }

  downloadPurchaseFile(fileId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/files/${fileId}/download`, {
      responseType: 'blob',
    });
  }

  private buildPurchaseQueryParams(query: PurchaseListQuery): HttpParams {
    let params = new HttpParams();

    if (query.search) {
      params = params.set('search', query.search);
    }

    if (query.searchType) {
      params = params.set('searchType', query.searchType);
    }

    if (query.condition) {
      params = params.set('condition', query.condition);
    }

    if (query.paymentForm) {
      params = params.set('paymentForm', query.paymentForm);
    }

    if (query.dateFrom) {
      params = params.set('dateFrom', query.dateFrom);
    }

    if (query.dateTo) {
      params = params.set('dateTo', query.dateTo);
    }

    if (query.sucursalesId !== null && query.sucursalesId !== undefined) {
      params = params.set('sucursalesId', String(query.sucursalesId));
    }

    if (query.vehicleId !== null && query.vehicleId !== undefined) {
      params = params.set('vehicleId', String(query.vehicleId));
    }

    if (query.createdByUserId !== null && query.createdByUserId !== undefined) {
      params = params.set('createdByUserId', String(query.createdByUserId));
    }

    return params;
  }
}
