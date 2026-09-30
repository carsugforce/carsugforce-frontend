export type HrEmployeeStatus =
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'REJECTED';

export type HrEmployeeType = 'NUEVO' | 'REINGRESO';
export type HrContractType = 'DETERMINADO' | 'INDETERMINADO';
export type HrApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type HrApprovalType = 'ECONOMIC_OFFER' | 'SALARY_CHANGE' | 'SETTLEMENT';

export interface HrPagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AttendancePagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface HrEmployeeQuery {
  search?: string | null;
  status?: string | null;
  employeeType?: string | null;
  sucursalesId?: number | null;
  positionId?: number | null;
  startDate?: string | null;
  birthDate?: string | null;
  startMonth?: number | null;
  birthMonth?: number | null;
  page?: number;
  pageSize?: number;
}

export interface HrEmployeeListItem {
  id: number;
  fullName: string;
  status: HrEmployeeStatus;
  employeeType: HrEmployeeType;
  idCheck?: string | null;
  curp?: string | null;
  rfc?: string | null;
  nss?: string | null;
  birthDate?: string | null;
  positionId?: number | null;
  positionName?: string | null;
  sucursalesId?: number | null;
  sucursalName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  contractType?: HrContractType | string | null;
  fixedTermDays?: number | null;
  renewalDate?: string | null;
  weeklyBaseSalary?: number | null;
  nominalWeeklyBudget?: number | null;
  hasPendingApproval: boolean;
  canRehire: boolean;
  canUndoTermination: boolean;
  photoUrl?: string | null;
}

export interface HrEmployeeDetail {
  id: number;
  status: HrEmployeeStatus;
  employeeType: HrEmployeeType;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string | null;
  fullName: string;
  idCheck?: string | null;
  ine?: string | null;
  curp?: string | null;
  nss?: string | null;
  rfc?: string | null;
  birthCertificateReference?: string | null;
  birthDate?: string | null;
  address?: string | null;
  infonavitNumber?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  clabe?: string | null;
  cardNumber?: string | null;
  personalPhone?: string | null;
  email?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  photoUrl?: string | null;
  photo?: HrEmployeePhoto | null;
  currentEmployment?: HrEmploymentPeriod | null;
  currentEconomicOffer?: HrEconomicOffer | null;
  employmentHistory: HrEmploymentPeriod[];
  terminations: HrTermination[];
  events: HrEmployeeEvent[];
  documents: HrEmployeeDocument[];
}

export interface HrEmploymentPeriod {
  id: number;
  sequenceNumber: number;
  employmentType: HrEmployeeType;
  status: string;
  employerRegistration: string;
  startDate: string;
  endDate?: string | null;
  positionId: number;
  positionName: string;
  sucursalesId: number;
  sucursalName: string;
  contractType: HrContractType;
  fixedTermDays?: number | null;
  indefiniteRenewalDate?: string | null;
}

export interface HrEconomicOffer {
  id: number;
  employmentPeriodId: number;
  offerType: string;
  status: HrApprovalStatus;
  isCurrent: boolean;
  effectiveDate: string;
  weeklyBaseSalary: number;
  dailyBaseSalary: number;
  sundayPremium: number;
  attendanceIncentive: number;
  punctualityIncentive: number;
  bonusValue: number;
  overtimeHourlyRate: number;
  nominalWeeklyBudget: number;
}

export interface HrTermination {
  id: number;
  reasonCode: string;
  terminationDate: string;
  observations?: string | null;
  isReverted: boolean;
  createdAt: string;
  revertedAt?: string | null;
}

export interface HrEmployeeEvent {
  id: number;
  eventType: string;
  description: string;
  dataJson?: string | null;
  createdByUserId: number;
  createdByUserName: string;
  createdAt: string;
}

export interface HrEmployeeDocument {
  id: number;
  section: string;
  documentType: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByUserId: number;
  uploadedAt: string;
}

export interface HrEmployeePhoto {
  id: number;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  url: string;
}

export interface HrEmployeeData {
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string | null;
  idCheck?: string | null;
  ine?: string | null;
  curp?: string | null;
  nss?: string | null;
  rfc?: string | null;
  birthCertificateReference?: string | null;
  birthDate?: string | null;
  address?: string | null;
  infonavitNumber?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  clabe?: string | null;
  cardNumber?: string | null;
  personalPhone?: string | null;
  email?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
}

export interface HrEmploymentSave {
  employerRegistration: string;
  startDate: string;
  positionId: number;
  sucursalesId: number;
  contractType: HrContractType;
  fixedTermDays?: number | null;
  indefiniteRenewalDate?: string | null;
}

export interface HrEmploymentUpdate {
  employerRegistration: string;
  startDate: string;
  positionId: number;
  sucursalesId: number;
  contractType: HrContractType;
  fixedTermDays?: number | null;
  indefiniteRenewalDate?: string | null;
}

export interface HrEconomicOfferSave {
  effectiveDate: string;
  weeklyBaseSalary: number;
  attendanceIncentive: number;
  punctualityIncentive: number;
  bonusValue: number;
  overtimeHourlyRate: number;
}

export interface HrCreateEmployeeRequest {
  employee: HrEmployeeData;
  employment: HrEmploymentSave;
  economicOffer: HrEconomicOfferSave;
}

export interface HrUpdateEmployeeRequest {
  employee: HrEmployeeData;
  currentEmployment?: HrEmploymentUpdate | null;
}

export interface HrRehireRequest {
  employment: HrEmploymentSave;
  economicOffer: HrEconomicOfferSave;
}

export interface HrSalaryChangeRequest {
  effectiveDate: string;
  reason: string;
  weeklyBaseSalary: number;
  attendanceIncentive: number;
  punctualityIncentive: number;
  bonusValue: number;
  overtimeHourlyRate: number;
}

export interface HrTerminateEmployeeRequest {
  reasonCode: string;
  terminationDate: string;
  observations?: string | null;
}

export interface HrApprovalQuery {
  status?: string | null;
  approvalType?: string | null;
  page?: number;
  pageSize?: number;
}

export interface HrApproval {
  id: number;
  approvalType: HrApprovalType;
  referenceId: number;
  employeeId: number;
  employeeName: string;
  status: HrApprovalStatus;
  requestedAt: string;
  requestedByUserName: string;
  assignedApproverUserId: number;
  assignedApproverUserName: string;
  effectiveDate?: string | null;
  reason?: string | null;
  previousWeeklyBaseSalary?: number | null;
  previousDailyBaseSalary?: number | null;
  previousSundayPremium?: number | null;
  previousAttendanceIncentive?: number | null;
  previousPunctualityIncentive?: number | null;
  previousBonusValue?: number | null;
  previousOvertimeHourlyRate?: number | null;
  newWeeklyBaseSalary?: number | null;
  previousNominalWeeklyBudget?: number | null;
  newDailyBaseSalary?: number | null;
  newSundayPremium?: number | null;
  newAttendanceIncentive?: number | null;
  newPunctualityIncentive?: number | null;
  newBonusValue?: number | null;
  newOvertimeHourlyRate?: number | null;
  newNominalWeeklyBudget?: number | null;
}

export interface HrApprovalDecision {
  approve: boolean;
  comments?: string | null;
}

export interface HrCatalogs {
  sucursales: HrSucursalOption[];
  positions: HrPositionOption[];
  contractTypes: HrCodeLabel[];
  terminationReasons: HrCodeLabel[];
  documentTypes: HrDocumentType[];
  bankOptions: string[];
  employerRegistrations: string[];
  economicApproverUserId?: number | null;
  economicApproverName?: string | null;
}

export interface HrSucursalOption {
  id: number;
  description: string;
}

export interface HrPositionOption {
  id: number;
  name: string;
}

export interface HrPositionCatalogItem {
  id: number;
  name: string;
  isActive: boolean;
  employeesCount: number;
}

export interface HrUpdatePositionRequest {
  name: string;
  isActive: boolean;
}

export interface HrCodeLabel {
  code: string;
  label: string;
}

export interface HrDocumentType {
  section: string;
  code: string;
  label: string;
}

export interface WorkSchedule {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isActive: boolean;
}

export interface AttendancePlanningQuery {
  year: number;
  week: number;
  sucursalesId?: number | null;
  employeeId?: number | null;
  workScheduleId?: number | null;
}

export interface AttendancePlanningWeek {
  year: number;
  week: number;
  weekStart: string;
  weekEnd: string;
  workSchedules: WorkSchedule[];
  employees: AttendancePlanningEmployee[];
}

export interface AttendancePlanningEmployee {
  employeeId: number;
  employeeName: string;
  employeeCode?: string | null;
  sucursalesId?: number | null;
  sucursalName?: string | null;
  defaultWorkScheduleId?: number | null;
  weeklyWorkScheduleId?: number | null;
  restDayOfWeek?: number | null;
  days: AttendancePlanningDay[];
}

export interface AttendancePlanningDay {
  date: string;
  dayType: string;
  workScheduleId?: number | null;
  workScheduleName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  breakMinutes: number;
  notes?: string | null;
}

export interface GenerateAttendanceWeekRequest {
  year: number;
  week: number;
  sucursalesId?: number | null;
}

export interface UpdateAttendanceDayRequest {
  employeeId: number;
  date: string;
  dayType: string;
  workScheduleId?: number | null;
  notes?: string | null;
}

export interface BulkAttendancePlanningRequest {
  year: number;
  week: number;
  employeeIds: number[];
  restDayOfWeek?: number | null;
  workScheduleId?: number | null;
}

export interface BiometricImport {
  id: number;
  originalFileName: string;
  fileHash: string;
  fileSize: number;
  importedAt: string;
  recordsFound: number;
  recordsCreated: number;
  recordsDuplicated: number;
  devicesFound: number;
  biometricCodesFound: number;
  associatedEmployees: number;
  unmatchedEmployees: number;
  periodFrom?: string | null;
  periodTo?: string | null;
  lastPunchAt?: string | null;
  status: string;
  errorMessage?: string | null;
}

export interface BiometricPunchQuery {
  importId?: number | null;
  search?: string | null;
  sucursalesId?: number | null;
  deviceCode?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  recordType?: string | null;
  associationStatus?: string | null;
  sortBy?: string | null;
  sortDirection?: string | null;
  page?: number;
  pageSize?: number;
}

export interface BiometricPunch {
  id: number;
  biometricImportId: number;
  importFileName: string;
  biometricEmployeeCode: string;
  employeeName?: string | null;
  employeeId?: number | null;
  sucursalName?: string | null;
  deviceCode: string;
  timestamp: string;
  date: string;
  time: string;
  rawRecordType?: string | null;
  normalizedRecordType?: string | null;
  verificationMethod?: string | null;
  workCode?: string | null;
  isAssociated: boolean;
}

export interface UnmatchedBiometricQuery {
  search?: string | null;
  deviceCode?: string | null;
  employeeCode?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
  pageSize?: number;
}

export interface UnmatchedBiometric {
  biometricEmployeeCode: string;
  deviceCode: string;
  punchCount: number;
  firstPunchAt: string;
  lastPunchAt: string;
}

export interface AttendanceWeekQuery {
  year: number;
  week: number;
  sucursalesId?: number | null;
  employeeId?: number | null;
  status?: string | null;
  withIncidents?: boolean | null;
}

export interface AttendanceWeekSummary {
  attendanceWeekId?: number | null;
  year: number;
  week: number;
  weekStart: string;
  weekEnd: string;
  status: string;
  employees: number;
  incidents: number;
  absences: number;
  lateArrivals: number;
  breakExcesses: number;
  incompleteRecords: number;
  workedRestDays: number;
  calculatedOvertimeMinutes: number;
  authorizedOvertimeMinutes: number;
  unmatchedBiometrics: number;
  employeeWeeks: AttendanceEmployeeWeek[];
}

export interface AttendanceEmployeeWeek {
  attendanceWeekId: number;
  employeeId: number;
  employeeName: string;
  employeeCode?: string | null;
  days: AttendanceEmployeeDay[];
}

export interface AttendanceEmployeeDay {
  attendanceDayId: number;
  date: string;
  dayType: string;
  plannedSchedule?: string | null;
  firstPunchAt?: string | null;
  lastPunchAt?: string | null;
  punchCount: number;
  lateMinutes: number;
  breakUsedMinutes: number;
  plannedBreakMinutes: number;
  grossWorkMinutes: number;
  calculatedOvertimeMinutes: number;
  overtimeAdjustmentMinutes: number;
  authorizedOvertimeMinutes: number;
  workedSunday: boolean;
  requiresReview: boolean;
  rhResolutionCode?: string | null;
  rhComments?: string | null;
  incidents: string[];
  warnings: string[];
  biometricMarks: AttendanceBiometricMark[];
}

export interface ImportReviewedAttendanceWeekResult {
  totalRows: number;
  appliedRows: number;
  unchangedRows: number;
  errorRows: number;
  errors: string[];
}

export interface AttendanceBiometricMark {
  biometricPunchId: number;
  timestamp: string;
  time: string;
  deviceCode: string;
  biometricEmployeeCode: string;
  rawRecordType?: string | null;
  normalizedRecordType?: string | null;
  biometricImportId: number;
  importFileName: string;
}
