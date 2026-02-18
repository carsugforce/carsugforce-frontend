import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Product } from '../../core/models/product.models';

export interface ProductFormData {
  mode: 'create' | 'edit';
  product?: Product;
  lines: { id: number; description: string }[];
}

@Component({
  standalone: true,
  selector: 'app-product-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent {

  isEditMode = false;

 form = this.fb.group({
  code: [''],
  description: ['', [Validators.required, Validators.minLength(3)]],
  lineId: [null, Validators.required],
  type: ['PRODUCTO', Validators.required],
  unit: ['PZ', Validators.required],
  min: [5, Validators.min(0)],
  max: [30, Validators.min(0)]
});


  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProductFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProductFormData
  ) {
    this.isEditMode = data.mode === 'edit';

   if (this.isEditMode && data.product) {
        this.form.patchValue({
            code: data.product.code,
            description: data.product.description,
            lineId: data.product.lineId,
            type: this.normalizeType(data.product.type),
            unit: data.product.unit,
            min: data.product.min,
            max: data.product.max
        });
    }

  }

    private normalizeType(type: string | number | null | undefined): string {
    if (!type) return 'PRODUCTO';

    if (typeof type === 'number') {
      return type === 1 ? 'USO_INTERNO' : 'PRODUCTO';
    }

    const normalized = type.toUpperCase().replace(' ', '_');

    if (normalized.includes('USO')) return 'USO_INTERNO';

    return 'PRODUCTO';
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
      if (this.form.invalid) return;

      const value = this.form.value;

      if ((value.min ?? 0) > (value.max ?? 0)) {
        this.form.get('max')?.setErrors({ minGreaterThanMax: true });
        return;
      }

      this.dialogRef.close({
        ...value,
        code: value.code?.trim() || null,
        description: value.description!.trim()
      });
    }

}
