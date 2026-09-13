import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { HrPositionCatalogItem } from '../../../core/models/hr.models';
import { HrService } from '../../../core/service/hr.service';
import { PermissionService } from '../../../core/service/permission.service';
import { SnackbarService } from '../../../core/service/snackbar.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  standalone: true,
  selector: 'app-positions',
  templateUrl: './positions.component.html',
  styleUrl: './positions.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
  ],
})
export class PositionsComponent implements OnInit {
  @ViewChild('positionDialog') positionDialog!: TemplateRef<unknown>;

  positions: HrPositionCatalogItem[] = [];
  search = '';
  filter: 'active' | 'inactive' = 'active';
  loading = true;
  saving = false;
  skeletonArray = Array(6);

  editingPosition: HrPositionCatalogItem | null = null;
  positionName = '';
  positionIsActive = true;

  constructor(
    private hrService: HrService,
    private dialog: MatDialog,
    private router: Router,
    public permissionService: PermissionService,
    private snackbar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.loadPositions();
  }

  get filteredPositions(): HrPositionCatalogItem[] {
    const term = this.search.trim().toLowerCase();

    return this.positions
      .filter((position) => position.name.toLowerCase().includes(term))
      .filter((position) => this.filter === 'active' ? position.isActive : !position.isActive);
  }

  loadPositions(): void {
    this.loading = true;
    this.hrService.getPositions().subscribe({
      next: (positions) => {
        this.positions = positions;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackbar.error('No se pudieron cargar los puestos.');
      },
    });
  }

  createPosition(): void {
    this.editingPosition = null;
    this.positionName = '';
    this.positionIsActive = true;
    this.openDialog();
  }

  editPosition(position: HrPositionCatalogItem): void {
    this.editingPosition = position;
    this.positionName = position.name;
    this.positionIsActive = position.isActive;
    this.openDialog();
  }

  savePosition(): void {
    const name = this.positionName.trim().toUpperCase();
    if (!name) {
      this.snackbar.warning('Captura el nombre del puesto.');
      return;
    }

    this.saving = true;
    const request$: Observable<unknown> = this.editingPosition
      ? this.hrService.updatePosition(this.editingPosition.id, { name, isActive: this.positionIsActive })
      : this.hrService.createPosition(name);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.dialog.closeAll();
        this.snackbar.success(this.editingPosition ? 'Puesto actualizado.' : 'Puesto creado.');
        this.loadPositions();
      },
      error: (error: any) => {
        this.saving = false;
        this.snackbar.error(this.errorMessage(error, 'No se pudo guardar el puesto.'));
      },
    });
  }

  deletePosition(position: HrPositionCatalogItem): void {
    if (position.employeesCount > 0) {
      this.dialog.open(ConfirmDialogComponent, {
        width: '390px',
        data: {
          type: 'warning',
          title: 'No se puede eliminar',
          message: 'Este puesto tiene empleados activos. Filtra la lista para revisarlos antes de modificarlo.',
          showCancel: false,
          confirmText: 'Entendido',
        },
      });
      return;
    }

    this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        type: 'warning',
        title: 'Eliminar puesto',
        message: `¿Seguro que deseas eliminar "${position.name}"?`,
        showCancel: true,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;

      this.hrService.deletePosition(position.id).subscribe({
        next: () => {
          this.snackbar.success('Puesto eliminado.');
          this.loadPositions();
        },
        error: (error) => this.snackbar.error(this.errorMessage(error, 'No se pudo eliminar el puesto.')),
      });
    });
  }

  goToEmployees(position: HrPositionCatalogItem): void {
    this.router.navigate(['/rh/empleados'], {
      queryParams: {
        positionId: position.id,
        status: 'ACTIVE',
      },
    });
  }

  private openDialog(): void {
    this.dialog.open(this.positionDialog, {
      width: '460px',
      panelClass: 'custom-dialog-panel',
      autoFocus: false,
    });
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.error || fallback;
  }


  
}
