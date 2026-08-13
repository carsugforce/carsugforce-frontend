import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';


// ============================================================
// SAVE REQUEST
// ============================================================

export interface SalesDailyEntrySaveRequest {
  saleDate: string;

  sucursalesId: number;


  // ==========================================================
  // VENTA SISTEMA
  // ==========================================================

  systemOrders: number;

  systemCashRegister: number;


  // ==========================================================
  // VENTA REAL
  // ==========================================================

  realOrders: number;

  realCashRegister: number;


  // ==========================================================
  // TRANSACCIONES
  // ==========================================================

  ordersChecks: number;

  cashRegisterChecks: number;

  cancelledOrders: number;

  cancelledCashRegister: number;


  // ==========================================================
  // CASH FLOW
  // ==========================================================

  cash: number;

  tpv: number;

  spei: number;


  // ==========================================================
  // CRÉDITO Y COBRANZA
  // ==========================================================

  systemTickets: number;

  employeeTickets: number;

  systemCreditAmount: number;

  employeeCreditAmount: number;

  collectionAmount: number;


  // ==========================================================
  // VOLUMEN
  // ==========================================================

  kilograms: number;

  pieces: number;


  // ==========================================================
  // VENTA DE ACTIVOS
  // ==========================================================

  assetSaleAmount: number;

  assetSalePaymentForm?: string | null;


  // ==========================================================
  // OBSERVACIONES
  // ==========================================================

  observations?: string | null;
}


// ============================================================
// DAILY ENTRY RESPONSE
// ============================================================

export interface SalesDailyEntry {
  id: number;

  saleDate: string;

  sucursalesId: number;

  sucursalName: string;


  // ==========================================================
  // SEMANA
  // ==========================================================

  weekNumber: number;

  weekStartDate: string;

  weekEndDate: string;


  // ==========================================================
  // VENTA SISTEMA
  // ==========================================================

  systemOrders: number;

  systemCashRegister: number;

  systemTotal: number;


  // ==========================================================
  // VENTA REAL
  // ==========================================================

  realOrders: number;

  realCashRegister: number;

  realTotal: number;


  // ==========================================================
  // VARIACIÓN
  // ==========================================================

  variation: number;


  // ==========================================================
  // TRANSACCIONES
  // ==========================================================

  ordersChecks: number;

  cashRegisterChecks: number;

  cancelledOrders: number;

  cancelledCashRegister: number;

  checksQuantity: number;

  averageTicket: number;


  // ==========================================================
  // CASH FLOW
  // ==========================================================

  cash: number;

  tpv: number;

  spei: number;

  cashFlowTotal: number;

  cashFlowDifference: number;

  cashFlowMatches: boolean;


  // ==========================================================
  // CRÉDITO Y COBRANZA
  // ==========================================================

  systemTickets: number;

  employeeTickets: number;

  systemCreditAmount: number;

  employeeCreditAmount: number;

  creditChecks: number;

  creditAmount: number;

  creditPercentage: number;

  collectionAmount: number;


  // ==========================================================
  // VOLUMEN
  // ==========================================================

  kilograms: number;

  pieces: number;


  // ==========================================================
  // VENTA DE ACTIVOS
  // ==========================================================

  assetSaleAmount: number;

  assetSalePaymentForm?: string | null;


  // ==========================================================
  // OBSERVACIONES
  // ==========================================================

  observations?: string | null;


  // ==========================================================
  // AUDITORÍA
  // ==========================================================

  createdByUserId: number;

  createdByUserName: string;

  createdAt: string;

  updatedByUserId?: number | null;

  updatedByUserName?: string | null;

  updatedAt?: string | null;
}


// ============================================================
// LIST RESPONSE
// ============================================================

export interface SalesDailyEntryListResponse {
  items: SalesDailyEntry[];

  total: number;

  page: number;

  pageSize: number;
}


// ============================================================
// DATABASE
// ============================================================

export interface SalesDatabaseVisibleUen {
  key: string;

  name: string;
}


export interface SalesDatabaseUenValues {
  entryId: number;

  sucursalesId: number;

  sucursalName: string;


  // ==========================================================
  // VENTA SISTEMA
  // ==========================================================

  systemOrders: number;

  systemCashRegister: number;

  systemTotal: number;


  // ==========================================================
  // VENTA REAL
  // ==========================================================

  realOrders: number;

  realCashRegister: number;

  realTotal: number;

  variation: number;


  // ==========================================================
  // TRANSACCIONES
  // ==========================================================

  ordersChecks: number;

  cashRegisterChecks: number;

  checksQuantity: number;

  cancelledOrders: number;

  cancelledCashRegister: number;

  cancelledTotal: number;

  averageTicket: number;


  // ==========================================================
  // CASH FLOW
  // ==========================================================

  cash: number;

  tpv: number;

  spei: number;

  cashFlowTotal: number;

  cashFlowDifference: number;

  cashFlowMatches: boolean;


  // ==========================================================
  // CRÉDITO Y COBRANZA
  // ==========================================================

  systemTickets: number;

  employeeTickets: number;

  systemCreditAmount: number;

  employeeCreditAmount: number;

  creditChecks: number;

  creditAmount: number;

  creditPercentage: number;

  collectionAmount: number;


  // ==========================================================
  // VOLUMEN
  // ==========================================================

  kilograms: number;

  pieces: number;


  // ==========================================================
  // VENTA DE ACTIVOS
  // ==========================================================

  assetSaleAmount: number;

  assetSalePaymentForm?: string | null;
}


export interface SalesDatabaseRow {
  saleDate: string;

  weekNumber: number;

  weekStartDate: string;

  weekEndDate: string;

  belisario?: SalesDatabaseUenValues | null;

  santaLucia?: SalesDatabaseUenValues | null;

  mayoristas?: SalesDatabaseUenValues | null;
}


export interface SalesDatabaseResponse {
  visibleUens: SalesDatabaseVisibleUen[];

  rows: SalesDatabaseRow[];
}


// ============================================================
// DATABASE FILTERS
// ============================================================

export interface SalesDatabaseFilters {
  dateFrom?: string;

  dateTo?: string;
}


// ============================================================
// SERVICE
// ============================================================

@Injectable({
  providedIn: 'root',
})
export class SalesService {

  private readonly baseUrl =
    `${environment.apiUrl}/sales`;


  constructor(
    private http: HttpClient,
  ) {}


  // ==========================================================
  // CREATE
  // ==========================================================

  createDailyEntry(
    request: SalesDailyEntrySaveRequest,
  ): Observable<SalesDailyEntry> {

    return this.http.post<SalesDailyEntry>(
      `${this.baseUrl}/daily`,
      request,
    );
  }


  // ==========================================================
  // UPDATE
  // ==========================================================

  updateDailyEntry(
    id: number,
    request: SalesDailyEntrySaveRequest,
  ): Observable<SalesDailyEntry> {

    return this.http.put<SalesDailyEntry>(
      `${this.baseUrl}/daily/${id}`,
      request,
    );
  }


  // ==========================================================
  // GET BY ID
  // ==========================================================

  getDailyEntryById(
    id: number,
  ): Observable<SalesDailyEntry> {

    return this.http.get<SalesDailyEntry>(
      `${this.baseUrl}/daily/${id}`,
    );
  }


  // ==========================================================
  // GET BY DATE + SUCURSAL
  // ==========================================================

  getDailyEntryByDate(
    sucursalesId: number,
    date: string,
  ): Observable<SalesDailyEntry> {

    const params =
      new HttpParams()
        .set(
          'sucursalesId',
          sucursalesId.toString(),
        )
        .set(
          'date',
          date,
        );


    return this.http.get<SalesDailyEntry>(
      `${this.baseUrl}/daily/by-date`,
      {
        params,
      },
    );
  }


  // ==========================================================
  // LIST
  // ==========================================================

  getDailyEntries(
    filters?: {
      sucursalesId?: number;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    },
  ): Observable<SalesDailyEntryListResponse> {

    let params =
      new HttpParams();


    if (filters?.sucursalesId) {
      params =
        params.set(
          'sucursalesId',
          filters.sucursalesId.toString(),
        );
    }


    if (filters?.dateFrom) {
      params =
        params.set(
          'dateFrom',
          filters.dateFrom,
        );
    }


    if (filters?.dateTo) {
      params =
        params.set(
          'dateTo',
          filters.dateTo,
        );
    }


    if (filters?.page) {
      params =
        params.set(
          'page',
          filters.page.toString(),
        );
    }


    if (filters?.pageSize) {
      params =
        params.set(
          'pageSize',
          filters.pageSize.toString(),
        );
    }


    return this.http.get<SalesDailyEntryListResponse>(
      `${this.baseUrl}/daily`,
      {
        params,
      },
    );
  }


  // ==========================================================
  // DATABASE
  // ==========================================================

  getDatabase(
    filters?: SalesDatabaseFilters,
  ): Observable<SalesDatabaseResponse> {

    let params =
      new HttpParams();


    if (filters?.dateFrom) {
      params =
        params.set(
          'dateFrom',
          filters.dateFrom,
        );
    }


    if (filters?.dateTo) {
      params =
        params.set(
          'dateTo',
          filters.dateTo,
        );
    }


    return this.http.get<SalesDatabaseResponse>(
      `${this.baseUrl}/database`,
      {
        params,
      },
    );
  }
}