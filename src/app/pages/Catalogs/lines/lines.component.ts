import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';


// Core
import { Line } from '../../../core/models/line.model';
import { LinesService } from '../../../core/service/lines.service';
import { PermissionService } from '../../../core/service/permission.service';
import { UserService } from '../../../core/service/user.service';

// Components
import { LineCardComponent } from '../../../shared/components/line-card/line-card.component';
import { CrediLineComponent } from '../../../modals/credi-line/credi-line.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SnackbarService } from '../../../core/service/snackbar.service';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-lines',
  templateUrl: './lines.component.html',
  styleUrls: ['./lines.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatDialogModule,
    LineCardComponent
  ]
})
export class LinesComponent implements OnInit {

  
  search = '';
  filter: 'all' | 'active' | 'inactive' = 'active';

  lines: Line[] = [];

  loading = true;
  skeletonArray = Array(6);

  constructor(
    private dialog: MatDialog,
    private linesService: LinesService,
    private userService: UserService,
    public permissionService: PermissionService,
    private snackbar: SnackbarService,
    private router: Router,
  ) {}

  // ============================
  // LIFECYCLE
  // ============================
  ngOnInit(): void {
    this.loadLines();
  }

  // ============================
  // DATA
  // ============================
  loadLines(): void {
    this.loading = true;

    this.linesService.getLines().subscribe({
      next: (data) => {
       
        this.lines = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // ============================
  // GETTERS
  // ============================
  get filteredLines(): Line[] {
    return this.lines
      .filter(l =>
        l.description.toLowerCase().includes(this.search.toLowerCase())
      )
      .filter(l => {
        if (this.filter === 'active') return l.isActive;
        if (this.filter === 'inactive') return !l.isActive;
        return true;
      });
  }

  // ============================
  // ACTIONS
  // ============================
  createLine(): void {
    const ref = this.dialog.open(CrediLineComponent, {
      width: '600px',
      disableClose: true,
      panelClass: 'custom-dialog-panel',
      data: {
        mode: 'create'
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
        this.linesService.createLine(result).subscribe({
          next: () => this.loadLines(),
          error: () => {
            this.snackbar.error('No se pudo crear la línea');
          }
        });
    });
  }

  editLine(line: Line): void {
    const ref = this.dialog.open(CrediLineComponent, {
      width: '600px',
      disableClose: true,
      panelClass: 'custom-dialog-panel',
      data: {
        mode: 'edit',
        description: line.description,
        isActive: line.isActive
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;

      this.linesService.updateLine(line.id, result).subscribe({
        next: () => {
          this.loadLines(); 
        },
        error: () => {
          this.snackbar.error('No se pudo editar la línea: ');
        }
      });
    });
  }


  deleteLine(line: Line): void {
    // ============================
    // BLOQUEO POR PRODUCTOS
    // ============================
    if (line.productsCount > 0) {
      this.dialog.open(ConfirmDialogComponent, {
        width: '380px',
        data: {
          type: 'warning',
          title: 'No se puede eliminar la línea',
          message:
            'Esta línea tiene productos asignados. Para eliminarla primero debes mover o eliminar esos productos.',
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
        title: 'Eliminar línea',
        message: `¿Seguro que deseas eliminar la línea "${line.description}"?`,
        showCancel: true,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;

      // ============================
      // DELETE REAL
      // ============================
      this.linesService.deleteLine(line.id).subscribe({
        next: () => {
          this.loadLines(); 
        },
        error: () => {
          this.snackbar.error('No se pudo eliminar la línea');
        }
      });
    });
  }

  goToProducts(line: Line): void {
    this.router.navigate(
      ['/catalogs/products'],
      {
        queryParams: {
          lineId: line.id,
          lineName: line.description
        }
      }
    );
  }



  
}
