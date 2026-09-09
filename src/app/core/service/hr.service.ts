import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import {
  HrApproval,
  HrApprovalDecision,
  HrApprovalQuery,
  HrCatalogs,
  HrCreateEmployeeRequest,
  HrEmployeeDetail,
  HrEmployeeDocument,
  HrEmployeeListItem,
  HrEmployeePhoto,
  HrEmployeeQuery,
  HrPagedResult,
  HrPositionOption,
  HrRehireRequest,
  HrSalaryChangeRequest,
  HrTerminateEmployeeRequest,
  HrUpdateEmployeeRequest,
} from '../models/hr.models';

@Injectable({ providedIn: 'root' })
export class HrService {
  private readonly baseUrl = '/api/hr';
  private readonly photoDownloads = new Map<number, Observable<HttpResponse<Blob>>>();

  constructor(private http: HttpClient) {}

  getCatalogs(): Observable<HrCatalogs> {
    return this.http.get<HrCatalogs>(`${this.baseUrl}/catalogs`);
  }

  createPosition(name: string): Observable<HrPositionOption> {
    return this.http.post<HrPositionOption>(`${this.baseUrl}/catalogs/positions`, {
      name,
    });
  }

  getEmployees(query: HrEmployeeQuery): Observable<HrPagedResult<HrEmployeeListItem>> {
    return this.http.get<HrPagedResult<HrEmployeeListItem>>(
      `${this.baseUrl}/employees`,
      { params: this.toParams(query) },
    );
  }

  getEmployee(employeeId: number): Observable<HrEmployeeDetail> {
    return this.http.get<HrEmployeeDetail>(`${this.baseUrl}/employees/${employeeId}`);
  }

  createEmployee(request: HrCreateEmployeeRequest): Observable<HrEmployeeDetail> {
    return this.http.post<HrEmployeeDetail>(`${this.baseUrl}/employees`, request);
  }

  updateEmployee(
    employeeId: number,
    request: HrUpdateEmployeeRequest,
  ): Observable<HrEmployeeDetail> {
    return this.http.put<HrEmployeeDetail>(
      `${this.baseUrl}/employees/${employeeId}`,
      request,
    );
  }

  rehireEmployee(employeeId: number, request: HrRehireRequest): Observable<HrEmployeeDetail> {
    return this.http.post<HrEmployeeDetail>(
      `${this.baseUrl}/employees/${employeeId}/rehire`,
      request,
    );
  }

  requestSalaryChange(employeeId: number, request: HrSalaryChangeRequest): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/employees/${employeeId}/salary-changes`,
      request,
    );
  }

  terminateEmployee(employeeId: number, request: HrTerminateEmployeeRequest): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/employees/${employeeId}/terminate`,
      request,
    );
  }

  undoTermination(employeeId: number): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/employees/${employeeId}/undo-termination`,
      {},
    );
  }

  getApprovals(query: HrApprovalQuery): Observable<HrPagedResult<HrApproval>> {
    return this.http.get<HrPagedResult<HrApproval>>(`${this.baseUrl}/approvals`, {
      params: this.toParams(query),
    });
  }

  decideApproval(approvalId: number, request: HrApprovalDecision): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/approvals/${approvalId}/decision`,
      request,
    );
  }

  getDocuments(employeeId: number): Observable<HrEmployeeDocument[]> {
    return this.http.get<HrEmployeeDocument[]>(
      `${this.baseUrl}/employees/${employeeId}/documents`,
    );
  }

  uploadDocument(
    employeeId: number,
    file: File,
    section: string,
    documentType: string,
  ): Observable<HrEmployeeDocument[]> {
    const formData = new FormData();
    formData.append('Files', file, file.name);
    formData.append('Sections', section);
    formData.append('DocumentTypes', documentType);

    return this.http.post<HrEmployeeDocument[]>(
      `${this.baseUrl}/employees/${employeeId}/documents`,
      formData,
    );
  }

  downloadDocument(documentId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/documents/${documentId}/download`, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  deleteDocument(documentId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/documents/${documentId}`);
  }

  uploadPhoto(employeeId: number, file: File): Observable<HrEmployeePhoto> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<HrEmployeePhoto>(
      `${this.baseUrl}/employees/${employeeId}/photo`,
      formData,
    );
  }

  downloadPhoto(photoId: number): Observable<HttpResponse<Blob>> {
    const cached = this.photoDownloads.get(photoId);
    if (cached) return cached;

    const request = this.http.get(`${this.baseUrl}/employee-photos/${photoId}/download`, {
      observe: 'response',
      responseType: 'blob',
    }).pipe(shareReplay({ bufferSize: 1, refCount: false }));

    this.photoDownloads.set(photoId, request);
    return request;
  }

  deletePhoto(employeeId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/employees/${employeeId}/photo`);
  }

  private toParams(source: object): HttpParams {
    let params = new HttpParams();

    Object.entries(source).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      params = params.set(key, String(value));
    });

    return params;
  }
}
