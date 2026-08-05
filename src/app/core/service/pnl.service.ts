export interface UpsertPnlPayrollMonthlyEntry {
  year: number;
  month: number;
  sucursalesId: number | null;

  regularPayroll: number;
  vacations: number;
  vacationBonus: number;
  christmasBonus: number;
  severancePayments: number;
  terminationPayments: number;
  decemberExpenseProvision: number;
  payrollTax: number;
  imssInfonavit: number;

  notes?: string | null;
}

export interface PnlPayrollMonthlyEntry extends UpsertPnlPayrollMonthlyEntry {
  id: number;
  sucursalName?: string | null;
  totalPayroll: number;
  createdAt: string;
  updatedAt?: string | null;
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';


export interface UpsertPnlPayrollMonthlyEntry {
  year: number;
  month: number;
  sucursalesId: number | null;

  regularPayroll: number;
  vacations: number;
  vacationBonus: number;
  christmasBonus: number;
  severancePayments: number;
  terminationPayments: number;
  decemberExpenseProvision: number;
  payrollTax: number;
  imssInfonavit: number;

  notes?: string | null;
}

export interface PnlPayrollMonthlyEntry extends UpsertPnlPayrollMonthlyEntry {
  id: number;
  sucursalName?: string | null;
  totalPayroll: number;
  createdAt: string;
  updatedAt?: string | null;
}

export interface PnlExpenseReportQuery {
  year: number;
  startMonth: number;
  endMonth: number;
  sucursalesId: number | null;
}

export interface PnlExpenseReportMonth {
  month: number;
  label: string;
}

export interface PnlExpenseReportRow {
  key: string;
  label: string;
  level: number;
  isHeader: boolean;
  source: string;
  amountsByMonth: Record<string, number>;
  accumulated: number;
}

export interface PnlExpenseReportWarning {
  type: string;
  message: string;
  count: number;
}

export interface PnlExpenseReport {
  year: number;
  startMonth: number;
  endMonth: number;
  sucursalesId: number | null;
  months: PnlExpenseReportMonth[];
  rows: PnlExpenseReportRow[];
  warnings: PnlExpenseReportWarning[];
}


@Injectable({
  providedIn: 'root',
})
export class PnlService {
  private readonly baseUrl = `${environment.apiUrl}/pnl`;

  constructor(private http: HttpClient) {}

  getMonthlyPayroll(
    year: number,
    month: number,
    sucursalesId: number | null
  ): Observable<PnlPayrollMonthlyEntry | null> {
    let params = new HttpParams()
      .set('year', year)
      .set('month', month);

    if (sucursalesId !== null && sucursalesId !== undefined) {
      params = params.set('sucursalesId', sucursalesId);
    }

    return this.http.get<PnlPayrollMonthlyEntry | null>(
      `${this.baseUrl}/payroll/monthly`,
      { params }
    );
  }

  saveMonthlyPayroll(
    request: UpsertPnlPayrollMonthlyEntry
  ): Observable<PnlPayrollMonthlyEntry> {
    return this.http.post<PnlPayrollMonthlyEntry>(
      `${this.baseUrl}/payroll/monthly`,
      request
    );
  }

  previewExpenseReport(query: PnlExpenseReportQuery) {
  return this.http.post<PnlExpenseReport>(
    `${this.baseUrl}/expense-report/preview`,
    query
  );
}

downloadExpenseReportExcel(query: PnlExpenseReportQuery) {
  return this.http.post(
    `${this.baseUrl}/expense-report/export-excel`,
    query,
    {
      responseType: 'blob',
      observe: 'response',
    }
  );
}


}