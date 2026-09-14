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
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TimeoutError, finalize, timeout } from 'rxjs';

import { HrCatalogs, HrEmployeeDetail, HrEmployeeDocument, HrEmploymentPeriod } from '../../../core/models/hr.models';
import { HrService } from '../../../core/service/hr.service';
import { PermissionService } from '../../../core/service/permission.service';
import { SnackbarService } from '../../../core/service/snackbar.service';
import { MoneyInputDirective } from '../../../shared/directives/money-input.directive';

@Component({
  selector: 'app-hr-employee-detail-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule,
    MatDatepickerModule, MatDialogModule, MatDividerModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatNativeDateModule, MatProgressSpinnerModule, MatSelectModule,
    MatTooltipModule, MoneyInputDirective],
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
  private documentsByType = new Map<string, HrEmployeeDocument>();
  documentChecklistSections: { code: string; label: string; types: { section: string; code: string; label: string }[] }[] = [];
  documentSelectGroups: { code: string; label: string; types: { section: string; code: string; label: string }[] }[] = [];
  catalogs: HrCatalogs | null = null;
  loading = false;
  loadError = '';
  working = false;
  activeTab: 'summary' | 'documents' | 'history' | 'management' | 'log' = 'summary';

  salaryForm!: FormGroup;
  terminationForm!: FormGroup;
  rehireForm!: FormGroup;

  selectedDocumentType = '';
  selectedFile: File | null = null;
  uploadingDocument = false;
  uploadingPhoto = false;
  photoPreviewUrl: string | null = null;
  photoPreviewSkipped = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmActionText = 'Confirmar';
  confirmIcon = 'help';

  readonly fixedTermOptions = [30, 60, 90];
  readonly fallbackEmployerRegistrations = ['Carsug SA de CV', 'Andrea Alvarez'];
  readonly fallbackDocumentTypes = [
    { section: 'RELACION', code: 'OTROS', label: 'Otros' },
  ];
  private readonly maxAutoPhotoBytes = 350 * 1024;
  private readonly documentSectionList = [
    { code: 'PERSONAL', label: 'Dctos personales' },
    { code: 'INGRESO', label: 'Dctos ingreso' },
    { code: 'RELACION', label: 'Dctos relación' },
    { code: 'SALIDA', label: 'Dctos salida' },
  ];

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
    this.hrService.getCatalogs().subscribe({
      next: c => {
        this.catalogs = c;
        this.indexDocumentCatalog();
      },
      error: () => this.snackbar.error('No se pudieron cargar los catálogos RH.'),
    });
  }

  loadEmployee(): void {
    this.loading = true;
    this.loadError = '';
    this.hrService.getEmployee(this.employeeId).pipe(
      timeout(20000),
      finalize(() => this.loading = false),
    ).subscribe({
      next: employee => {
        const normalizedEmployee = this.normalizeEmployee(employee);
        this.employee = normalizedEmployee;
        this.indexDocuments(normalizedEmployee);
        this.prefillSalary();
        this.loadPhotoPreview(normalizedEmployee);
      },
      error: error => {
        this.employee = null;
        this.loadError = error instanceof TimeoutError
          ? 'El servidor tardó demasiado en responder el expediente.'
          : 'No se pudo cargar el empleado.';
        this.snackbar.error(this.loadError);
      }
    });
  }

  loadPhotoPreview(employee: HrEmployeeDetail, force = false): void {
    const photoId = employee.photo?.id;
    if (!photoId) {
      this.clearPhotoPreview();
      this.photoPreviewSkipped = false;
      return;
    }

    if (!force && (employee.photo?.sizeBytes ?? 0) > this.maxAutoPhotoBytes) {
      this.clearPhotoPreview();
      this.photoPreviewSkipped = true;
      return;
    }

    this.photoPreviewSkipped = false;
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
    this.salaryForm.reset({
      effectiveDate: this.iso(new Date()),
      reason: 'Ajuste salarial',
      weeklyBaseSalary: o?.weeklyBaseSalary ?? 0,
      attendanceIncentive: o?.attendanceIncentive ?? 0,
      punctualityIncentive: o?.punctualityIncentive ?? 0,
      bonusValue: o?.bonusValue ?? 0,
      overtimeHourlyRate: o?.overtimeHourlyRate ?? 0,
    });
  }

  openSalary(): void { this.prefillSalary(); this.dialog.open(this.salaryDialog,{width:'760px',panelClass:'custom-dialog-panel'}); }
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
  onDocumentTypeFileSelected(type: { section: string; code: string }, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    input.value = '';
    if (!file) return;

    this.uploadingDocument = true;
    this.hrService.uploadDocument(this.employeeId, file, type.section, type.code)
      .pipe(finalize(() => this.uploadingDocument = false))
      .subscribe({
        next: () => {
          this.snackbar.success(`${this.documentTypeLabel(type.code)} actualizado.`);
          this.loadEmployee();
        },
        error: e => this.snackbar.error(this.err(e, 'No se pudo cargar el documento.')),
      });
  }
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    input.value = '';
    if (!file) return;

    this.uploadingPhoto = true;
    this.compressEmployeePhoto(file)
      .then(photoFile => {
        this.hrService.uploadPhoto(this.employeeId, photoFile)
          .pipe(finalize(() => this.uploadingPhoto = false))
          .subscribe({
            next: photo => {
              if (this.employee) {
                this.employee = {
                  ...this.employee,
                  photo,
                  photoUrl: photo.url,
                };
                this.loadPhotoPreview(this.employee, true);
              }
              this.snackbar.success('Foto actualizada.');
              this.loadEmployee();
            },
            error: e => this.snackbar.error(this.err(e, 'No se pudo cargar la foto.')),
          });
      })
      .catch(() => {
        this.uploadingPhoto = false;
        this.snackbar.error('No se pudo procesar la foto.');
      });
  }

  private async compressEmployeePhoto(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) return file;

    const bitmap = await this.loadImageBitmap(file);
    const maxSide = 720;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return file;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);

    const targetBytes = 180 * 1024;
    const candidates = [
      { type: 'image/webp', extension: 'webp', qualities: [0.82, 0.78, 0.74, 0.7] },
      { type: 'image/jpeg', extension: 'jpg', qualities: [0.86, 0.82, 0.78, 0.74, 0.7] },
    ];
    let bestFile: File | null = null;

    for (const candidate of candidates) {
      for (const quality of candidate.qualities) {
        const blob = await this.canvasToBlob(canvas, candidate.type, quality);
        if (!blob) continue;

        const compressed = new File(
          [blob],
          this.compressedPhotoName(file.name, candidate.extension),
          { type: candidate.type, lastModified: Date.now() },
        );

        if (!bestFile || compressed.size < bestFile.size) {
          bestFile = compressed;
        }

        if (compressed.size <= targetBytes) return compressed;
      }
    }

    if (!bestFile || bestFile.size >= file.size) return file;
    return bestFile;
  }

  private loadImageBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
    if ('createImageBitmap' in window) {
      return createImageBitmap(file);
    }

    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject();
      };
      image.src = url;
    });
  }

  private canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  private compressedPhotoName(fileName: string, extension: string): string {
    const baseName = fileName.replace(/\.[^.]+$/, '') || 'foto-empleado';
    return `${baseName}.${extension}`;
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

  employeeTerminationDate(employee: HrEmployeeDetail): string | null {
    if (employee.status !== 'INACTIVE') return null;
    const activeTermination = employee.terminations
      ?.filter(termination => !termination.isReverted)
      .sort((a, b) => new Date(b.terminationDate).getTime() - new Date(a.terminationDate).getTime())[0];

    return activeTermination?.terminationDate || employee.currentEmployment?.endDate || null;
  }

  reasonLabel(code:string):string { return this.cleanText(this.catalogs?.terminationReasons.find(x=>x.code===code)?.label || code); }
  documentTypeLabel(code:string):string { return this.cleanText(this.documentTypes().find(x=>x.code===code)?.label || code); }
  sectionLabel(section:string):string { return ({PERSONAL:'Personales',INGRESO:'Ingreso',RELACION:'Relación',SALIDA:'Salida'} as any)[section]||section; }
  documentForType(code: string): HrEmployeeDocument | null {
    return this.documentsByType.get(code) ?? null;
  }

  private indexDocuments(employee: HrEmployeeDetail): void {
    this.documentsByType.clear();
    for (const doc of employee.documents || []) {
      if (!this.documentsByType.has(doc.documentType)) {
        this.documentsByType.set(doc.documentType, doc);
      }
    }
  }

  private normalizeEmployee(employee: HrEmployeeDetail): HrEmployeeDetail {
    return {
      ...employee,
      documents: employee.documents ?? [],
      employmentHistory: employee.employmentHistory ?? [],
      terminations: employee.terminations ?? [],
      events: employee.events ?? [],
    };
  }

  get employerRegistrationOptions(): string[] {
    return this.catalogs?.employerRegistrations?.length
      ? this.catalogs.employerRegistrations
      : this.fallbackEmployerRegistrations;
  }
  employmentStatusLabel(status:string): string {
    return ({ACTIVE:'Activo',CLOSED:'Cerrado',INACTIVE:'Baja',PENDING_APPROVAL:'Pendiente autorización'} as any)[status] || this.cleanText(status);
  }

  employmentRenewalDate(period: HrEmploymentPeriod): Date | null {
    if (period.contractType === 'INDETERMINADO') {
      return period.indefiniteRenewalDate ? new Date(`${period.indefiniteRenewalDate}T00:00:00`) : null;
    }

    if (period.contractType !== 'DETERMINADO' || !period.fixedTermDays) return null;
    const date = new Date(`${period.startDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    date.setDate(date.getDate() + period.fixedTermDays);
    return date;
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
  documentTypes(): { section: string; code: string; label: string }[] {
    const byCode = new Map<string, { section: string; code: string; label: string }>();
    for (const type of [...(this.catalogs?.documentTypes ?? []), ...this.fallbackDocumentTypes]) {
      if (this.isHiddenDocumentType(type.code)) continue;
      byCode.set(type.code, { ...type, label: this.normalizeDocumentLabel(type.code, type.label) });
    }
    return Array.from(byCode.values());
  }
  private isHiddenDocumentType(code: string): boolean {
    return code === 'VOBO_FINIQUITO';
  }
  private normalizeDocumentLabel(code: string, label: string): string {
    if (code === 'ANTIGUEDAD_DERECHOS') return 'Antigüedad / derechos';
    if (code === 'OTROS') return 'Otros';
    return this.cleanText(label);
  }
  private indexDocumentCatalog(): void {
    const types = this.documentTypes();
    this.documentChecklistSections = this.documentSectionList.map(section => ({
      ...section,
      types: types.filter(type => type.section === section.code),
    }));
    this.documentSelectGroups = this.documentChecklistSections.map(section => ({
      code: section.code,
      label: this.sectionLabel(section.code),
      types: section.types,
    }));
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

