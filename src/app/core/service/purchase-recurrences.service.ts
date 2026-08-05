import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PurchaseRecurrenceFrequencyType = 'DAYS' | 'WEEKS' | 'MONTHS';

export interface CreatePurchaseRecurrenceRequest {
  sourcePurchaseId: number;
  name: string;
  frequencyType: PurchaseRecurrenceFrequencyType;
  frequencyInterval: number;
  startDate: string;
  nextRunDate: string;
  endDate?: string | null;
  notes?: string | null;
}

export interface PurchaseRecurrenceListItem {
  id: number;
  name: string;

  sourcePurchaseId: number;
  sourceFolio: string;

  supplierId: number;
  supplierName: string;

  frequencyType: string;
  frequencyInterval: number;

  startDate: string;
  nextRunDate: string;
  endDate?: string | null;

  isActive: boolean;
  lastRunAt?: string | null;

  lastGeneratedPurchaseId?: number | null;
  lastGeneratedPurchaseFolio?: string | null;

  notes?: string | null;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class PurchaseRecurrencesService {
  private baseUrl = `${environment.apiUrl}/purchase-recurrences`;

  constructor(private http: HttpClient) {}

  create(
    payload: CreatePurchaseRecurrenceRequest,
  ): Observable<PurchaseRecurrenceListItem> {
    return this.http.post<PurchaseRecurrenceListItem>(this.baseUrl, payload);
  }

  getAll(): Observable<PurchaseRecurrenceListItem[]> {
    return this.http.get<PurchaseRecurrenceListItem[]>(this.baseUrl);
  }

  toggle(id: number): Observable<PurchaseRecurrenceListItem> {
    return this.http.patch<PurchaseRecurrenceListItem>(
      `${this.baseUrl}/${id}/toggle`,
      {},
    );
  }

  generateNext(id: number): Observable<{ purchaseId: number; message: string }> {
    return this.http.post<{ purchaseId: number; message: string }>(
      `${this.baseUrl}/${id}/generate-next`,
      {},
    );
  }
}