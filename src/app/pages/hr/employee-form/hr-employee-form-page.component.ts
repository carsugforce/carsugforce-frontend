import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  HrCatalogs,
  HrCreateEmployeeRequest,
  HrEmployeeDetail,
  HrUpdateEmployeeRequest,
} from '../../../core/models/hr.models';
import { HrService } from '../../../core/service/hr.service';
import { PermissionService } from '../../../core/service/permission.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  selector: 'app-hr-employee-form-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-MX' }],
  templateUrl: './hr-employee-form-page.component.html',
  styleUrl: './hr-employee-form-page.component.scss',
})
export class HrEmployeeFormPageComponent implements OnInit {
  @ViewChild('positionDialog') positionDialog!: TemplateRef<unknown>;

  form!: FormGroup;
  positionForm!: FormGroup;
  catalogs: HrCatalogs | null = null;
  employee: HrEmployeeDetail | null = null;

  loading = false;
  saving = false;
  creatingPosition = false;
  editMode = false;
  employeeId: number | null = null;

  readonly fixedTermOptions = [30, 60, 90];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private hrService: HrService,
    public permissionService: PermissionService,
    private snackbar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.employeeId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.editMode = !!this.employeeId;
    this.buildForms();
    this.bindContractType();
    this.loadCatalogs();

    if (this.editMode && this.employeeId) this.loadEmployee(this.employeeId);
  }

  private buildForms(): void {
    const today = new Date();

    this.form = this.fb.group({
      firstName: ['', Validators.required],
      paternalLastName: ['', Validators.required],
      maternalLastName: [''],
      idCheck: [''],
      ine: [''],
      curp: [''],
      nss: [''],
      rfc: [''],
      birthCertificateReference: [''],
      address: [''],
      infonavitNumber: [''],

      bankName: [''],
      bankAccount: [''],
      clabe: [''],
      cardNumber: [''],

      personalPhone: [''],
      email: ['', Validators.email],
      emergencyContactName: [''],
      emergencyContactPhone: [''],

      employerRegistration: ['Carsug SA de CV', Validators.required],
      startDate: [today, Validators.required],
      positionId: [null, Validators.required],
      sucursalesId: [null, Validators.required],
      contractType: ['DETERMINADO', Validators.required],
      fixedTermDays: [30, Validators.required],
      indefiniteRenewalDate: [null],

      effectiveDate: [today, Validators.required],
      weeklyBaseSalary: [0, [Validators.required, Validators.min(0.01)]],
      attendanceIncentive: [0, [Validators.required, Validators.min(0)]],
      punctualityIncentive: [0, [Validators.required, Validators.min(0)]],
      bonusValue: [0, [Validators.required, Validators.min(0)]],
      overtimeHourlyRate: [0, [Validators.required, Validators.min(0)]],
    });

    this.positionForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(160)]],
    });
  }

  private bindContractType(): void {
    this.form.get('contractType')?.valueChanges.subscribe((value) => {
      const fixed = this.form.get('fixedTermDays');
      const renewal = this.form.get('indefiniteRenewalDate');

      if (value === 'DETERMINADO') {
        fixed?.setValidators([Validators.required]);
        renewal?.clearValidators();
        renewal?.setValue(null, { emitEvent: false });
      } else {
        fixed?.clearValidators();
        fixed?.setValue(null, { emitEvent: false });
        renewal?.clearValidators();
      }

      fixed?.updateValueAndValidity({ emitEvent: false });
      renewal?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private loadCatalogs(): void {
    this.hrService.getCatalogs().subscribe({
      next: (catalogs) => (this.catalogs = catalogs),
      error: () => this.snackbar.error('No se pudieron cargar UEN, puestos y catálogos de RH.'),
    });
  }

  private loadEmployee(employeeId: number): void {
    this.loading = true;
    this.hrService
      .getEmployee(employeeId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (employee) => {
          this.employee = employee;
          const employment = employee.currentEmployment;

          this.form.patchValue({
            firstName: employee.firstName,
            paternalLastName: employee.paternalLastName,
            maternalLastName: employee.maternalLastName ?? '',
            idCheck: employee.idCheck ?? '',
            ine: employee.ine ?? '',
            curp: employee.curp ?? '',
            nss: employee.nss ?? '',
            rfc: employee.rfc ?? '',
            birthCertificateReference: employee.birthCertificateReference ?? '',
            address: employee.address ?? '',
            infonavitNumber: employee.infonavitNumber ?? '',
            bankName: employee.bankName ?? '',
            bankAccount: employee.bankAccount ?? '',
            clabe: employee.clabe ?? '',
            cardNumber: employee.cardNumber ?? '',
            personalPhone: employee.personalPhone ?? '',
            email: employee.email ?? '',
            emergencyContactName: employee.emergencyContactName ?? '',
            emergencyContactPhone: employee.emergencyContactPhone ?? '',
            employerRegistration: employment?.employerRegistration ?? 'Carsug SA de CV',
            startDate: employment?.startDate ? new Date(employment.startDate) : null,
            positionId: employment?.positionId ?? null,
            sucursalesId: employment?.sucursalesId ?? null,
            contractType: employment?.contractType ?? 'DETERMINADO',
            fixedTermDays: employment?.fixedTermDays ?? null,
            indefiniteRenewalDate: employment?.indefiniteRenewalDate
              ? new Date(employment.indefiniteRenewalDate)
              : null,
          });
        },
        error: () => {
          this.snackbar.error('No se pudo cargar el empleado.');
          this.router.navigate(['/rh/empleados']);
        },
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackbar.warning('Revisa los campos obligatorios del formulario.');
      return;
    }

    const raw = this.form.getRawValue();
    const employee = {
      firstName: this.clean(raw.firstName)!,
      paternalLastName: this.clean(raw.paternalLastName)!,
      maternalLastName: this.clean(raw.maternalLastName),
      idCheck: this.clean(raw.idCheck),
      ine: this.clean(raw.ine),
      curp: this.clean(raw.curp),
      nss: this.clean(raw.nss),
      rfc: this.clean(raw.rfc),
      birthCertificateReference: this.clean(raw.birthCertificateReference),
      address: this.clean(raw.address),
      infonavitNumber: this.clean(raw.infonavitNumber),
      bankName: this.clean(raw.bankName),
      bankAccount: this.clean(raw.bankAccount),
      clabe: this.clean(raw.clabe),
      cardNumber: this.clean(raw.cardNumber),
      personalPhone: this.clean(raw.personalPhone),
      email: this.clean(raw.email),
      emergencyContactName: this.clean(raw.emergencyContactName),
      emergencyContactPhone: this.clean(raw.emergencyContactPhone),
    };

    this.saving = true;

    if (this.editMode && this.employeeId) {
      const request: HrUpdateEmployeeRequest = {
        employee,
        currentEmployment: this.employee?.currentEmployment
          ? {
              employerRegistration: this.clean(raw.employerRegistration)!,
              positionId: Number(raw.positionId),
              sucursalesId: Number(raw.sucursalesId),
              contractType: raw.contractType,
              fixedTermDays:
                raw.contractType === 'DETERMINADO'
                  ? Number(raw.fixedTermDays)
                  : null,
              indefiniteRenewalDate:
                raw.contractType === 'INDETERMINADO'
                  ? this.toIsoDate(raw.indefiniteRenewalDate)
                  : null,
            }
          : null,
      };

      this.hrService
        .updateEmployee(this.employeeId, request)
        .pipe(finalize(() => (this.saving = false)))
        .subscribe({
          next: () => {
            this.snackbar.success('Datos del empleado actualizados.');
            this.router.navigate(['/rh/empleados', this.employeeId]);
          },
          error: (error) => this.snackbar.error(this.errorMessage(error, 'No se pudo actualizar el empleado.')),
        });
      return;
    }

    const request: HrCreateEmployeeRequest = {
      employee,
      employment: {
        employerRegistration: this.clean(raw.employerRegistration)!,
        startDate: this.toIsoDate(raw.startDate)!,
        positionId: Number(raw.positionId),
        sucursalesId: Number(raw.sucursalesId),
        contractType: raw.contractType,
        fixedTermDays:
          raw.contractType === 'DETERMINADO' ? Number(raw.fixedTermDays) : null,
        indefiniteRenewalDate:
          raw.contractType === 'INDETERMINADO'
            ? this.toIsoDate(raw.indefiniteRenewalDate)
            : null,
      },
      economicOffer: {
        effectiveDate: this.toIsoDate(raw.effectiveDate)!,
        weeklyBaseSalary: this.toNumber(raw.weeklyBaseSalary),
        attendanceIncentive: this.toNumber(raw.attendanceIncentive),
        punctualityIncentive: this.toNumber(raw.punctualityIncentive),
        bonusValue: this.toNumber(raw.bonusValue),
        overtimeHourlyRate: this.toNumber(raw.overtimeHourlyRate),
      },
    };

    this.hrService
      .createEmployee(request)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (created) => {
          this.snackbar.success('Alta capturada. La oferta económica quedó pendiente de autorización.');
          this.router.navigate(['/rh/empleados', created.id]);
        },
        error: (error) => this.snackbar.error(this.errorMessage(error, 'No se pudo registrar el empleado.')),
      });
  }

  openPositionDialog(): void {
    this.positionForm.reset({ name: '' });
    this.dialog.open(this.positionDialog, {
      width: '440px',
      panelClass: 'custom-dialog-panel',
    });
  }

  createPosition(): void {
    if (this.positionForm.invalid) return;
    this.creatingPosition = true;

    this.hrService
      .createPosition(this.positionForm.value.name.trim())
      .pipe(finalize(() => (this.creatingPosition = false)))
      .subscribe({
        next: (position) => {
          this.catalogs ??= {
            sucursales: [],
            positions: [],
            contractTypes: [],
            terminationReasons: [],
            documentTypes: [],
          };
          this.catalogs.positions = [...this.catalogs.positions, position].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          this.form.patchValue({ positionId: position.id });
          this.dialog.closeAll();
          this.snackbar.success('Puesto agregado al catálogo.');
        },
        error: (error) => this.snackbar.error(this.errorMessage(error, 'No se pudo crear el puesto.')),
      });
  }

  get dailyBaseSalary(): number {
    return this.round(this.toNumber(this.form?.value.weeklyBaseSalary) / 7);
  }

  get sundayPremium(): number {
    return this.round(this.dailyBaseSalary * 0.25);
  }

  get nominalWeeklyBudget(): number {
    return this.round(
      this.toNumber(this.form?.value.weeklyBaseSalary) +
        this.sundayPremium +
        this.toNumber(this.form?.value.attendanceIncentive) +
        this.toNumber(this.form?.value.punctualityIncentive) +
        this.toNumber(this.form?.value.bonusValue),
    );
  }

  private toNumber(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private clean(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text || null;
  }

  private toIsoDate(value: unknown): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return null;
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || fallback;
  }
}
