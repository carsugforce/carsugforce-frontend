import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { HrCatalogs, HrEmployeeDetail, HrEmployeeDocument } from '../../../core/models/hr.models';
import { HrService } from '../../../core/service/hr.service';
import { PermissionService } from '../../../core/service/permission.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  selector: 'app-hr-employee-detail-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule,
    MatDatepickerModule, MatDialogModule, MatDividerModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatNativeDateModule, MatProgressSpinnerModule, MatSelectModule, MatTabsModule,
    MatTooltipModule],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-MX' }],
  templateUrl: './hr-employee-detail-page.component.html',
  styleUrl: './hr-employee-detail-page.component.scss',
})
export class HrEmployeeDetailPageComponent implements OnInit, OnDestroy {
  @ViewChild('salaryDialog') salaryDialog!: TemplateRef<unknown>;
  @ViewChild('terminationDialog') terminationDialog!: TemplateRef<unknown>;
  @ViewChild('rehireDialog') rehireDialog!: TemplateRef<unknown>;
  @ViewChild('confirmDialog') confirmDialog!: TemplateRef<unknown>;

  employeeId = 0;
  employee: HrEmployeeDetail | null = null;
  catalogs: HrCatalogs | null = null;
  loading = false;
  working = false;

  salaryForm!: FormGroup;
  terminationForm!: FormGroup;
  rehireForm!: FormGroup;

  selectedDocumentType = '';
  selectedFile: File | null = null;
  uploadingDocument = false;
  uploadingPhoto = false;
  photoPreviewUrl: string | null = null;
  confirmTitle = '';
  confirmMessage = '';
  confirmActionText = 'Confirmar';
  confirmIcon = 'help';

  readonly fixedTermOptions = [30, 60, 90];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private hrService: HrService,
    public permissionService: PermissionService,
    private snackbar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.employeeId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.employeeId) { this.router.navigate(['/rh/empleados']); return; }
    this.buildForms();
    this.loadCatalogs();
    this.loadEmployee();
  }

  ngOnDestroy(): void {
    this.clearPhotoPreview();
  }

  private buildForms(): void {
    const today = new Date();
    this.salaryForm = this.fb.group({
      effectiveDate: [today, Validators.required], reason: ['', Validators.required],
      weeklyBaseSalary: [0, [Validators.required, Validators.min(.01)]],
      attendanceIncentive: [0, [Validators.required, Validators.min(0)]],
      punctualityIncentive: [0, [Validators.required, Validators.min(0)]],
      bonusValue: [0, [Validators.required, Validators.min(0)]],
      overtimeHourlyRate: [0, [Validators.required, Validators.min(0)]],
    });
    this.terminationForm = this.fb.group({
      reasonCode: ['', Validators.required], terminationDate: [today, Validators.required], observations: [''],
    });
    this.rehireForm = this.fb.group({
      employerRegistration: ['Carsug SA de CV', Validators.required], startDate: [today, Validators.required],
      positionId: [null, Validators.required], sucursalesId: [null, Validators.required],
      contractType: ['DETERMINADO', Validators.required], fixedTermDays: [30, Validators.required], indefiniteRenewalDate: [null],
      effectiveDate: [today, Validators.required], weeklyBaseSalary: [0, [Validators.required, Validators.min(.01)]],
      attendanceIncentive: [0, [Validators.required, Validators.min(0)]], punctualityIncentive: [0, [Validators.required, Validators.min(0)]],
      bonusValue: [0, [Validators.required, Validators.min(0)]], overtimeHourlyRate: [0, [Validators.required, Validators.min(0)]],
    });
  }

  private loadCatalogs(): void {
    this.hrService.getCatalogs().subscribe({ next: c => this.catalogs = c, error: () => this.snackbar.error('No se pudieron cargar los catálogos RH.') });
  }

  loadEmployee(): void {
    this.loading = true;
    this.hrService.getEmployee(this.employeeId).pipe(finalize(() => this.loading = false)).subscribe({
      next: employee => {
        this.employee = employee;
        this.prefillSalary();
        this.loadPhotoPreview(employee);
      },
      error: () => { this.snackbar.error('No se pudo cargar el empleado.'); this.router.navigate(['/rh/empleados']); }
    });
  }

  private loadPhotoPreview(employee: HrEmployeeDetail): void {
    const photoId = employee.photo?.id;
    if (!photoId) {
      this.clearPhotoPreview();
      return;
    }

    this.hrService.downloadPhoto(photoId).subscribe({
      next: response => {
        this.clearPhotoPreview();
        this.photoPreviewUrl = response.body ? URL.createObjectURL(response.body) : null;
      },
      error: () => this.clearPhotoPreview(),
    });
  }

  private clearPhotoPreview(): void {
    if (!this.photoPreviewUrl) return;
    URL.revokeObjectURL(this.photoPreviewUrl);
    this.photoPreviewUrl = null;
  }

  private prefillSalary(): void {
    const o = this.employee?.currentEconomicOffer;
    if (!o) return;
    this.salaryForm.patchValue({ weeklyBaseSalary: o.weeklyBaseSalary, attendanceIncentive: o.attendanceIncentive,
      punctualityIncentive: o.punctualityIncentive, bonusValue: o.bonusValue, overtimeHourlyRate: o.overtimeHourlyRate });
  }

  openSalary(): void { this.prefillSalary(); this.salaryForm.patchValue({ effectiveDate: new Date(), reason: '' }); this.dialog.open(this.salaryDialog,{width:'760px',panelClass:'custom-dialog-panel'}); }
  openTermination(): void { this.terminationForm.reset({reasonCode:'',terminationDate:new Date(),observations:''}); this.dialog.open(this.terminationDialog,{width:'620px',panelClass:'custom-dialog-panel'}); }
  openRehire(): void {
    const last = this.employee?.employmentHistory?.[0]; const offer = this.employee?.currentEconomicOffer;
    this.rehireForm.reset({ employerRegistration:last?.employerRegistration || 'Carsug SA de CV', startDate:new Date(), positionId:last?.positionId ?? null,
      sucursalesId:last?.sucursalesId ?? null, contractType:last?.contractType || 'DETERMINADO', fixedTermDays:last?.fixedTermDays || 30,
      indefiniteRenewalDate:null, effectiveDate:new Date(), weeklyBaseSalary:offer?.weeklyBaseSalary || 0, attendanceIncentive:offer?.attendanceIncentive || 0,
      punctualityIncentive:offer?.punctualityIncentive || 0, bonusValue:offer?.bonusValue || 0, overtimeHourlyRate:offer?.overtimeHourlyRate || 0 });
    this.dialog.open(this.rehireDialog,{width:'900px',panelClass:'custom-dialog-panel'});
  }

  requestSalaryChange(): void {
    if (this.salaryForm.invalid) { this.salaryForm.markAllAsTouched(); return; }
    const r=this.salaryForm.getRawValue(); this.working=true;
    this.hrService.requestSalaryChange(this.employeeId,{effectiveDate:this.iso(r.effectiveDate)!,reason:String(r.reason).trim(),weeklyBaseSalary:+r.weeklyBaseSalary,
      attendanceIncentive:+r.attendanceIncentive,punctualityIncentive:+r.punctualityIncentive,bonusValue:+r.bonusValue,overtimeHourlyRate:+r.overtimeHourlyRate})
      .pipe(finalize(()=>this.working=false)).subscribe({next:()=>{this.dialog.closeAll();this.snackbar.success('Cambio salarial enviado a autorización.');this.loadEmployee();},error:e=>this.snackbar.error(this.err(e,'No se pudo solicitar el cambio salarial.'))});
  }

  terminate(): void {
    if (this.terminationForm.invalid) { this.terminationForm.markAllAsTouched(); return; }
    const r=this.terminationForm.getRawValue(); this.working=true;
    this.hrService.terminateEmployee(this.employeeId,{reasonCode:r.reasonCode,terminationDate:this.iso(r.terminationDate)!,observations:String(r.observations||'').trim()||null})
      .pipe(finalize(()=>this.working=false)).subscribe({next:()=>{this.dialog.closeAll();this.snackbar.success('Baja aplicada correctamente.');this.loadEmployee();},error:e=>this.snackbar.error(this.err(e,'No se pudo aplicar la baja.'))});
  }

  undoTermination(): void {
    this.openConfirm({
      title: 'Deshacer baja',
      message: 'El empleado volverá a quedar activo con su última relación laboral.',
      actionText: 'Deshacer baja',
      icon: 'undo',
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.working=true; this.hrService.undoTermination(this.employeeId).pipe(finalize(()=>this.working=false)).subscribe({next:()=>{this.snackbar.success('Baja deshecha. El empleado quedó activo.');this.loadEmployee();},error:e=>this.snackbar.error(this.err(e,'No se pudo deshacer la baja.'))});
    });
  }
  rehire(): void {
    if (this.rehireForm.invalid) { this.rehireForm.markAllAsTouched(); return; }
    const r=this.rehireForm.getRawValue(); this.working=true;
    this.hrService.rehireEmployee(this.employeeId,{employment:{employerRegistration:r.employerRegistration,startDate:this.iso(r.startDate)!,positionId:+r.positionId,
      sucursalesId:+r.sucursalesId,contractType:r.contractType,fixedTermDays:r.contractType==='DETERMINADO'?+r.fixedTermDays:null,
      indefiniteRenewalDate:r.contractType==='INDETERMINADO'?this.iso(r.indefiniteRenewalDate):null},economicOffer:{effectiveDate:this.iso(r.effectiveDate)!,
      weeklyBaseSalary:+r.weeklyBaseSalary,attendanceIncentive:+r.attendanceIncentive,punctualityIncentive:+r.punctualityIncentive,bonusValue:+r.bonusValue,overtimeHourlyRate:+r.overtimeHourlyRate}})
      .pipe(finalize(()=>this.working=false)).subscribe({next:()=>{this.dialog.closeAll();this.snackbar.success('Reingreso enviado a autorización.');this.loadEmployee();},error:e=>this.snackbar.error(this.err(e,'No se pudo registrar el reingreso.'))});
  }

  onFileSelected(event: Event): void { const input=event.target as HTMLInputElement; this.selectedFile=input.files?.[0] || null; }
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    input.value = '';
    if (!file) return;

    this.uploadingPhoto = true;
    this.hrService.uploadPhoto(this.employeeId, file)
      .pipe(finalize(() => this.uploadingPhoto = false))
      .subscribe({
        next: photo => {
          if (this.employee) {
            this.employee = {
              ...this.employee,
              photo,
              photoUrl: photo.url,
            };
            this.loadPhotoPreview(this.employee);
          }
          this.snackbar.success('Foto actualizada.');
          this.loadEmployee();
        },
        error: e => this.snackbar.error(this.err(e, 'No se pudo cargar la foto.')),
      });
  }

  deletePhoto(): void {
    this.openConfirm({
      title: 'Retirar foto',
      message: 'La foto dejará de mostrarse en el expediente del empleado.',
      actionText: 'Retirar',
      icon: 'delete_outline',
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.uploadingPhoto = true;
      this.hrService.deletePhoto(this.employeeId)
        .pipe(finalize(() => this.uploadingPhoto = false))
        .subscribe({
          next: () => {
            if (this.employee) {
              this.employee = {
                ...this.employee,
                photo: null,
                photoUrl: null,
              };
            }
            this.clearPhotoPreview();
            this.snackbar.success('Foto retirada.');
            this.loadEmployee();
          },
          error: e => this.snackbar.error(this.err(e, 'No se pudo retirar la foto.')),
        });
    });
  }
  uploadDocument(): void {
    if (!this.selectedFile || !this.selectedDocumentType) { this.snackbar.warning('Selecciona tipo de documento y archivo.'); return; }
    const type=this.catalogs?.documentTypes.find(x=>x.code===this.selectedDocumentType); if(!type) return;
    this.uploadingDocument=true; this.hrService.uploadDocument(this.employeeId,this.selectedFile,type.section,type.code).pipe(finalize(()=>this.uploadingDocument=false))
      .subscribe({next:()=>{this.selectedFile=null;this.selectedDocumentType='';this.snackbar.success('Documento agregado al expediente.');this.loadEmployee();},error:e=>this.snackbar.error(this.err(e,'No se pudo cargar el documento.'))});
  }
  downloadDocument(doc: HrEmployeeDocument): void { this.hrService.downloadDocument(doc.id).subscribe({next:r=>{if(!r.body)return;const u=URL.createObjectURL(r.body);const a=document.createElement('a');a.href=u;a.download=doc.originalFileName;a.click();URL.revokeObjectURL(u);},error:()=>this.snackbar.error('No se pudo descargar el documento.')}); }
  deleteDocument(doc: HrEmployeeDocument): void {
    this.openConfirm({
      title: 'Retirar documento',
      message: `${doc.originalFileName} dejará de mostrarse en el expediente.`,
      actionText: 'Retirar',
      icon: 'delete_outline',
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.hrService.deleteDocument(doc.id).subscribe({next:()=>{this.snackbar.success('Documento retirado.');this.loadEmployee();},error:e=>this.snackbar.error(this.err(e,'No se pudo retirar el documento.'))});
    });
  }

  labelStatus(s:string):string { return ({ACTIVE:'Activo',INACTIVE:'Baja',PENDING_APPROVAL:'Pendiente autorización',REJECTED:'Rechazado'} as any)[s]||s; }
  employeePhotoUrl(employee: HrEmployeeDetail): string | null {
    if (this.photoPreviewUrl) return this.photoPreviewUrl;

    const source = employee as HrEmployeeDetail & Record<string, unknown>;
    const candidates = [
      source['photo'] && typeof source['photo'] === 'object'
        ? (source['photo'] as unknown as Record<string, unknown>)['url']
        : null,
      source['photoUrl'],
      source['profilePhotoUrl'],
      source['employeePhotoUrl'],
      source['avatarUrl'],
      source['pictureUrl'],
      source['imageUrl'],
    ];

    const photo = candidates.find((value) => {
      if (typeof value !== 'string' || !value.trim()) return false;
      return !value.includes('/api/hr/employee-photos/');
    });

    return typeof photo === 'string' ? photo : null;
  }

  employeeInitials(employee: HrEmployeeDetail): string {
    const parts = [
      employee.firstName,
      employee.paternalLastName,
      employee.maternalLastName,
    ].filter(Boolean);

    if (!parts.length) {
      return 'RH';
    }

    return parts
      .slice(0, 2)
      .map((part) => String(part).trim().charAt(0).toUpperCase())
      .join('');
  }

  reasonLabel(code:string):string { return this.cleanText(this.catalogs?.terminationReasons.find(x=>x.code===code)?.label || code); }
  documentTypeLabel(code:string):string { return this.cleanText(this.catalogs?.documentTypes.find(x=>x.code===code)?.label || code); }
  sectionLabel(section:string):string { return ({PERSONAL:'Personales',INGRESO:'Ingreso',RELACION:'Relación',SALIDA:'Salida'} as any)[section]||section; }
  employmentStatusLabel(status:string): string {
    return ({ACTIVE:'Activo',CLOSED:'Cerrado',INACTIVE:'Baja',PENDING_APPROVAL:'Pendiente autorización'} as any)[status] || this.cleanText(status);
  }
  cleanText(value: string | null | undefined): string {
    if (!value) return '';
    return String(value)
      .replace(/\u00c3\u00a1/g, 'á')
      .replace(/\u00c3\u00a9/g, 'é')
      .replace(/\u00c3\u00ad/g, 'í')
      .replace(/\u00c3\u00b3/g, 'ó')
      .replace(/\u00c3\u00ba/g, 'ú')
      .replace(/\u00c3\u00b1/g, 'ñ')
      .replace(/\u00c3\u0081/g, 'Á')
      .replace(/\u00c3\u0089/g, 'É')
      .replace(/\u00c3\u008d/g, 'Í')
      .replace(/\u00c3\u0093/g, 'Ó')
      .replace(/\u00c3\u009a/g, 'Ú')
      .replace(/\u00c3\u0091/g, 'Ñ')
      .replace(/\u00c2\u00b7/g, '·')
      .replace(/\u00e2\u20ac\u201d/g, '-');
  }
  formatBytes(bytes:number):string { if(bytes<1024)return `${bytes} B`; if(bytes<1048576)return `${(bytes/1024).toFixed(1)} KB`; return `${(bytes/1048576).toFixed(1)} MB`; }
  private openConfirm(config: { title: string; message: string; actionText: string; icon: string }) {
    this.confirmTitle = config.title;
    this.confirmMessage = config.message;
    this.confirmActionText = config.actionText;
    this.confirmIcon = config.icon;
    return this.dialog.open(this.confirmDialog, {
      width: '460px',
      panelClass: 'custom-dialog-panel',
      autoFocus: false,
    }).afterClosed();
  }
  private iso(v:unknown):string|null { if(!v)return null;const d=v instanceof Date?v:new Date(String(v));if(isNaN(d.getTime()))return null;const l=new Date(d.getTime()-d.getTimezoneOffset()*60000);return l.toISOString().slice(0,10); }
  private err(e:any,f:string):string { return e?.error?.message || f; }
}

