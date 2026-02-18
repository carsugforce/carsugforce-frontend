import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

export interface LineDialogData {
  mode: 'create' | 'edit';
  description?: string;
  isActive?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-credi-line',
  templateUrl: './credi-line.component.html',
  styleUrls: ['./credi-line.component.scss'],
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
export class CrediLineComponent {

  isEditMode = false;
  originalIsActive = true;

  form = this.fb.group({
    description: ['', [Validators.required, Validators.minLength(3)]],
    toggleAction: [false] 
  });

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CrediLineComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: LineDialogData
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
      ? 'Desactivar línea'
      : 'Reactivar línea';
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
      this.toggleLabel==="Desactivar línea" && 
      wantsToggle === true 
    ) {
      const ref = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        
        data: {
          type: 'warning',
          title: 'Desactivar línea?',
          message:  
            'Al desactivarla ya no podrá usarse en nuevos productos, hasta que se reactive. ¿Deseas desactivar esta línea?',
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
