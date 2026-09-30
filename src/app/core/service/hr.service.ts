import { HttpClient, HttpEvent, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import {
  HrApproval,
  HrApprovalDecision,
  HrApprovalQuery,
  AttendanceEmployeeWeek,
  AttendancePagedResult,
  AttendancePlanningQuery,
  AttendancePlanningWeek,
  AttendanceWeekQuery,
  AttendanceWeekSummary,
  BiometricImport,
  BiometricPunch,
  BiometricPunchQuery,
  BulkAttendancePlanningRequest,
  GenerateAttendanceWeekRequest,
  ImportReviewedAttendanceWeekResult,
  HrCatalogs,
  HrCreateEmployeeRequest,
  HrEmployeeDetail,
  HrEmployeeDocument,
  HrEmployeeListItem,
  HrEmployeePhoto,
  HrEmployeeQuery,
  HrPagedResult,
  HrPositionCatalogItem,
  HrPositionOption,
  HrRehireRequest,
  HrSalaryChangeRequest,
  HrTerminateEmployeeRequest,
  HrUpdatePositionRequest,
  HrUpdateEmployeeRequest,
  UnmatchedBiometric,
  UnmatchedBiometricQuery,
  UpdateAttendanceDayRequest,
  WorkSchedule,
} from '../models/hr.models';
import { environment } from '../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class HrService {
  private readonly baseUrl = `${environment.apiUrl}/hr`;
  private readonly photoDownloads = new Map<number, Observable<HttpResponse<Blob>>>();

  constructor(private http: HttpClient) {}

  getCatalogs(): Observable<HrCatalogs> {
    return this.http.get<HrCatalogs>(`${this.baseUrl}/catalogs`);
  }

  getPositions(): Observable<HrPositionCatalogItem[]> {
    return this.http.get<HrPositionCatalogItem[]>(`${this.baseUrl}/catalogs/positions`);
  }

  createPosition(name: string): Observable<HrPositionOption> {
    return this.http.post<HrPositionOption>(`${this.baseUrl}/catalogs/positions`, {
      name,
    });
  }

  updatePosition(positionId: number, request: HrUpdatePositionRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/catalogs/positions/${positionId}`, request);
  }

  deletePosition(positionId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/catalogs/positions/${positionId}`);
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

  uploadDocuments(
    employeeId: number,
    files: File[],
    section: string,
    documentType: string,
  ): Observable<HrEmployeeDocument[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('Files', file, file.name);
      formData.append('Sections', section);
      formData.append('DocumentTypes', documentType);
    }

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

  getWorkSchedules(): Observable<WorkSchedule[]> {
    return this.http.get<WorkSchedule[]>(`${this.baseUrl}/attendance/work-schedules`);
  }

  getAttendancePlanning(query: AttendancePlanningQuery): Observable<AttendancePlanningWeek> {
    return this.http.get<AttendancePlanningWeek>(`${this.baseUrl}/attendance/planning`, {
      params: this.toParams(query),
    });
  }

  generateAttendancePlanning(request: GenerateAttendanceWeekRequest): Observable<AttendancePlanningWeek> {
    return this.http.post<AttendancePlanningWeek>(
      `${this.baseUrl}/attendance/planning/generate`,
      request,
    );
  }

  copyPreviousAttendancePlanning(request: GenerateAttendanceWeekRequest): Observable<AttendancePlanningWeek> {
    return this.http.post<AttendancePlanningWeek>(
      `${this.baseUrl}/attendance/planning/copy-previous`,
      request,
    );
  }

  updateAttendanceDay(request: UpdateAttendanceDayRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/attendance/planning/day`, request);
  }

  applyBulkAttendancePlanning(request: BulkAttendancePlanningRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/attendance/planning/bulk`, request);
  }

  createVacationRange(request: {
    employeeId: number;
    dateFrom: string;
    dateTo: string;
    notes?: string | null;
  }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/attendance/vacations`, request);
  }

  importBiometrics(file: File): Observable<BiometricImport> {
    const formData = new FormData();
    formData.append('File', file, file.name);

    return this.http.post<BiometricImport>(
      `${this.baseUrl}/attendance/biometrics/import`,
      formData,
    );
  }

  importBiometricsWithProgress(file: File): Observable<HttpEvent<BiometricImport>> {
    const formData = new FormData();
    formData.append('File', file, file.name);

    return this.http.post<BiometricImport>(
      `${this.baseUrl}/attendance/biometrics/import`,
      formData,
      { observe: 'events', reportProgress: true },
    );
  }

  getBiometricImports(): Observable<BiometricImport[]> {
    return this.http.get<BiometricImport[]>(`${this.baseUrl}/attendance/biometrics/imports`);
  }

  getBiometricPunches(query: BiometricPunchQuery): Observable<AttendancePagedResult<BiometricPunch>> {
    return this.http.get<AttendancePagedResult<BiometricPunch>>(
      `${this.baseUrl}/attendance/biometrics/punches`,
      { params: this.toParams(query) },
    );
  }

  getUnmatchedBiometrics(query: UnmatchedBiometricQuery): Observable<AttendancePagedResult<UnmatchedBiometric>> {
    return this.http.get<AttendancePagedResult<UnmatchedBiometric>>(
      `${this.baseUrl}/attendance/biometrics/unmatched`,
      { params: this.toParams(query) },
    );
  }

  associateBiometricIdentity(request: {
    employeeId: number;
    biometricEmployeeCode: string;
    deviceCode?: string | null;
  }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/attendance/biometrics/associate`, request);
  }

  getAttendanceWeekSummary(query: AttendanceWeekQuery): Observable<AttendanceWeekSummary> {
    return this.http.get<AttendanceWeekSummary>(`${this.baseUrl}/attendance/weeks/summary`, {
      params: this.toParams(query),
    });
  }

  getAttendanceEmployeeWeek(attendanceWeekId: number, employeeId: number): Observable<AttendanceEmployeeWeek> {
    return this.http.get<AttendanceEmployeeWeek>(
      `${this.baseUrl}/attendance/weeks/${attendanceWeekId}/employees/${employeeId}`,
    );
  }

  resolveAttendanceDay(attendanceDayId: number, request: { resolutionCode: string; comments: string }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/attendance/days/${attendanceDayId}/resolve`, request);
  }

  adjustAttendanceOvertime(attendanceDayId: number, request: { overtimeAdjustmentMinutes: number; comments: string }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/attendance/days/${attendanceDayId}/overtime`, request);
  }

  authorizeAttendanceWeek(attendanceWeekId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/attendance/weeks/${attendanceWeekId}/authorize`, {});
  }

  reopenAttendanceWeek(attendanceWeekId: number, reason: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/attendance/weeks/${attendanceWeekId}/reopen`, { reason });
  }

  exportAttendanceWeek(query: AttendanceWeekQuery): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/attendance/weeks/export`, {
      params: this.toParams(query),
      responseType: 'blob',
    });
  }

  importReviewedAttendanceWeek(file: File, apply = true): Observable<ImportReviewedAttendanceWeekResult> {
    const formData = new FormData();
    formData.append('File', file, file.name);
    formData.append('Apply', String(apply));

    return this.http.post<ImportReviewedAttendanceWeekResult>(
      `${this.baseUrl}/attendance/weeks/import-reviewed`,
      formData,
    );
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
