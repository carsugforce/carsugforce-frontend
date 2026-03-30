import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// Core

import { PermissionService } from '../../../core/service/permission.service';
import { UserService } from '../../../core/service/user.service';
import { SnackbarService } from '../../../core/service/snackbar.service';

// Components
import { FamilyCardComponent } from '../../../shared/components/family-card/family-card.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Family } from '../../../core/models/model.family';
import { FamilyService } from '../../../core/service/family.service';
import { CrediFamilyComponent } from '../../../modals/credi-family/credi-family.component';
import { Router } from '@angular/router';


@Component({
  standalone: true,
  selector: 'app-family',
  templateUrl: './family.component.html',
  styleUrls: ['./family.component.scss'],

  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatDialogModule,
    FamilyCardComponent
]
})
export class FamilyComponent implements OnInit {

  search = '';
  filter: 'all' | 'active' | 'inactive' = 'active';

  families: Family[] = [];

  loading = true;
  skeletonArray = Array(6);

  constructor(
    private dialog: MatDialog,
    private familiesService: FamilyService,
    private userService: UserService,
    public permissionService: PermissionService,
    private snackbar: SnackbarService,
     private router: Router
  ) {}

  // ============================
  // LIFECYCLE
  // ============================
  ngOnInit(): void {
    this.loadFamilies();
  }

  // ============================
  // DATA
  // ============================
  loadFamilies(): void {
    this.loading = true;

    this.familiesService.getFamilies().subscribe({
      next: (data) => {
        this.families = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackbar.error('No se pudieron cargar las familias');
      }
    });
  }

  // ============================
  // GETTERS
  // ============================
  get filteredFamilies(): Family[] {
    return this.families
      .filter(f =>
        f.description.toLowerCase().includes(this.search.toLowerCase())
      )
      .filter(f => {
        if (this.filter === 'active') return f.isActive;
        if (this.filter === 'inactive') return !f.isActive;
        return true;
      });
  }

  // ============================
  // ACTIONS
  // ============================
  createFamily(): void {
    const ref = this.dialog.open(CrediFamilyComponent, {
      width: '600px',
      disableClose: true,
      panelClass: 'custom-dialog-panel',
      data: {
        mode: 'create'
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;

      this.familiesService.createFamily(result).subscribe({
        next: () => {
          this.loadFamilies();
          this.snackbar.success('Familia creada correctamente');
        },
        error: (err) => {
          const message = err?.error || 'No se pudo crear la familia';
          this.snackbar.error(message);
        }
      });
    });
  }

  editFamily(family: Family): void {
    const ref = this.dialog.open(CrediFamilyComponent, {
      width: '600px',
      disableClose: true,
      panelClass: 'custom-dialog-panel',
      data: {
        mode: 'edit',
        description: family.description,
        isActive: family.isActive
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;

      this.familiesService.updateFamily(family.id, result).subscribe({
        next: () => {
          this.loadFamilies();
          this.snackbar.success('Familia actualizada correctamente');
        },
        error: (err) => {
          const message = err?.error || 'No se pudo editar la familia';
          this.snackbar.error(message);
        }
      });
    });
  }

  toggleFamily(family: Family): void {
    const nextState = !family.isActive;

    this.familiesService.updateFamily(family.id, {
      description: family.description,
      isActive: nextState
    }).subscribe({
      next: () => {
        family.isActive = nextState;
        this.snackbar.success(
          nextState
            ? 'Familia activada correctamente'
            : 'Familia desactivada correctamente'
        );
      },
      error: (err) => {
        const message = err?.error || 'No se pudo actualizar el estado de la familia';
        this.snackbar.error(message);
      }
    });
  }

  deleteFamily(family: Family): void {
    // ============================
    // BLOQUEO POR LÍNEAS
    // ============================
    if (family.linesCount > 0) {
      this.dialog.open(ConfirmDialogComponent, {
        width: '380px',
        data: {
          type: 'warning',
          title: 'No se puede eliminar la familia',
          message:
            'Esta familia tiene líneas asignadas. Para eliminarla primero debes mover o eliminar esas líneas.',
          showCancel: false,
          confirmText: 'Entendido'
        }
      });
      return;
    }

    // ============================
    // CONFIRMACIÓN
    // ============================
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        type: 'warning',
        title: 'Eliminar familia',
        message: `¿Seguro que deseas eliminar la familia "${family.description}"?`,
        showCancel: true,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;

      this.familiesService.deleteFamily(family.id).subscribe({
        next: () => {
          this.loadFamilies();
          this.snackbar.success('Familia eliminada correctamente');
        },
        error: (err) => {
          const message = err?.error || 'No se pudo eliminar la familia';
          this.snackbar.error(message);
        }
      });
    });
  }

  goToLines(family: Family): void {
  this.router.navigate(['/catalogs/lines'], {
    queryParams: {
      familyId: family.id,
      familyName: family.description
    }
  });
}












}