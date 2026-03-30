import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

export interface FamilyDialogData {
  mode: 'create' | 'edit';
  description?: string;
  isActive?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-credi-family',
  templateUrl: './credi-family.component.html',
  styleUrls: ['./credi-family.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatSlideToggleModule
  ]
})
export class CrediFamilyComponent {
  isEditMode = false;
  originalIsActive = true;

  form = this.fb.group({
    description: ['', [Validators.required, Validators.minLength(3)]],
    toggleAction: [false]
  });

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CrediFamilyComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: FamilyDialogData
  ) {
    this.isEditMode = data?.mode === 'edit';

    if (this.isEditMode) {
      this.originalIsActive = data.isActive ?? true;

      this.form.patchValue({
        description: data.description ?? '',
        toggleAction: false
      });
    }
  }

  get toggleLabel(): string {
    return this.originalIsActive
      ? 'Desactivar familia'
      : 'Reactivar familia';
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) return;

    const wantsToggle = this.form.value.toggleAction;
    let finalIsActive = this.originalIsActive;

    // ============================
    // CASO: EDIT + QUIERE DESACTIVAR
    // ============================
    if (
      this.isEditMode &&
      this.originalIsActive === true &&
      wantsToggle === true
    ) {
      const ref = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          type: 'warning',
          title: '¿Desactivar familia?',
          message:
            'Al desactivarla ya no podrá usarse en nuevas líneas hasta que se reactive. ¿Deseas desactivar esta familia?',
          showCancel: true,
          confirmText: 'Desactivar',
          cancelText: 'Cancelar'
        }
      });

      ref.afterClosed().subscribe(ok => {
        if (!ok) return;

        this.dialogRef.close({
          description: this.form.value.description!.trim(),
          isActive: false
        });
      });

      return;
    }

    // ============================
    // RESTO DE CASOS
    // ============================
    if (this.isEditMode && wantsToggle) {
      finalIsActive = !this.originalIsActive;
    }

    this.dialogRef.close({
      description: this.form.value.description!.trim(),
      isActive: finalIsActive
    });
  }
}