import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { HrApproval } from '../../../core/models/hr.models';
import { HrService } from '../../../core/service/hr.service';
import { PermissionService } from '../../../core/service/permission.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  selector: 'app-hr-approvals-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule,
    MatDialogModule, MatDividerModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatPaginatorModule, MatProgressSpinnerModule, MatSelectModule],
  templateUrl: './hr-approvals-page.component.html',
  styleUrl: './hr-approvals-page.component.scss',
})
export class HrApprovalsPageComponent implements OnInit {
  @ViewChild('decisionDialog') decisionDialog!: TemplateRef<unknown>;

  rows: HrApproval[] = [];
  loading = false;
  working = false;
  total = 0;
  page = 1;
  pageSize = 20;
  status = 'PENDING';
  approvalType = '';
  selected: HrApproval | null = null;
  decisionApprove = true;
  decisionForm = this.fb.group({ comments: [''] });

  readonly statuses = [
    { value: 'PENDING', label: 'Pendientes' },
    { value: 'APPROVED', label: 'Aprobadas' },
    { value: 'REJECTED', label: 'Rechazadas' },
  ];

  readonly types = [
    { value: 'ECONOMIC_OFFER', label: 'Oferta económica' },
    { value: 'SALARY_CHANGE', label: 'Cambio salarial' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private hrService: HrService,
    public permissionService: PermissionService,
    private snackbar: SnackbarService,
  ) {}

  ngOnInit(): void { this.load(); }

  load(reset = false): void {
    if (reset) this.page = 1;
    this.loading = true;
    this.hrService.getApprovals({status:this.status || null,approvalType:this.approvalType || null,page:this.page,pageSize:this.pageSize})
      .pipe(finalize(()=>this.loading=false)).subscribe({
        next:r=>{this.rows=r.items||[];this.total=r.total||0;this.page=r.page||1;this.pageSize=r.pageSize||20;},
        error:e=>this.snackbar.error(e?.error?.message || 'No se pudo cargar la bandeja de autorizaciones.')
      });
  }

  onPage(e:PageEvent):void{this.page=e.pageIndex+1;this.pageSize=e.pageSize;this.load();}
  typeLabel(v:string):string{return this.types.find(x=>x.value===v)?.label||v;}
  statusLabel(v:string):string{return this.statuses.find(x=>x.value===v)?.label||v;}

  openDecision(row:HrApproval, approve:boolean):void{
    this.selected=row;this.decisionApprove=approve;this.decisionForm.reset({comments:''});
    this.dialog.open(this.decisionDialog,{width:'540px',panelClass:'custom-dialog-panel'});
  }

  decide():void{
    if(!this.selected)return;this.working=true;
    this.hrService.decideApproval(this.selected.id,{approve:this.decisionApprove,comments:String(this.decisionForm.value.comments||'').trim()||null})
      .pipe(finalize(()=>this.working=false)).subscribe({
        next:()=>{this.dialog.closeAll();this.snackbar.success(this.decisionApprove?'Autorización aprobada.':'Autorización rechazada.');this.load();},
        error:e=>this.snackbar.error(e?.error?.message || 'No se pudo registrar la decisión.')
      });
  }
}
