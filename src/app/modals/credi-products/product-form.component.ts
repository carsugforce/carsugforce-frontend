import {
  Component,
  Inject,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnInit,
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Product } from '../../core/models/product.models';
import { Family } from '../../core/models/model.family';
import { FamilyService } from '../../core/service/family.service';

export interface ProductFormData {
  mode: 'create' | 'edit';

  product?: Product;

  lines: {
    id: number;
    description: string;
    familyId: number;
    familyDescription: string;
  }[];
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
    MatSelectModule,
  ],

  templateUrl: './product-form.component.html',

  styleUrls: ['./product-form.component.scss'],
})
export class ProductFormComponent
  implements OnInit, AfterViewInit
{
  isEditMode = false;

  families: Family[] = [];

  filteredLines: {
    id: number;
    description: string;
    familyId: number;
    familyDescription: string;
  }[] = [];

  @ViewChild('costoInput')
  costoInput?: ElementRef<HTMLInputElement>;

  @ViewChild('precioInput')
  precioInput?: ElementRef<HTMLInputElement>;

  form = this.fb.group({
    code:
      this.fb.nonNullable.control(''),

    description:
      this.fb.nonNullable.control(
        '',
        [
          Validators.required,
          Validators.minLength(3),
        ],
      ),

    barras:
      this.fb.nonNullable.control(''),

    // ============================
    // CATÁLOGOS
    // ============================

    familyId:
      this.fb.control<number | null>(
        null,
        Validators.required,
      ),

    lineId:
      this.fb.control<number | null>(
        null,
        Validators.required,
      ),

    type:
      this.fb.nonNullable.control(
        'PRODUCTO',
        Validators.required,
      ),

    unit:
      this.fb.nonNullable.control(
        'PZ',
        Validators.required,
      ),

    pesable:
      this.fb.nonNullable.control(
        'NO',
      ),

    min:
      this.fb.nonNullable.control(
        5,
        Validators.min(0),
      ),

    max:
      this.fb.nonNullable.control(
        30,
        Validators.min(0),
      ),

    costo:
      this.fb.control<number | null>(
        null,
        Validators.min(0),
      ),

    precio:
      this.fb.control<number | null>(
        null,
        Validators.min(0),
      ),

    partida:
      this.fb.nonNullable.control(''),

    criterio:
      this.fb.nonNullable.control(''),

    clase:
      this.fb.nonNullable.control(''),

    tipoEgreso:
      this.fb.nonNullable.control(''),
  });

  private readonly currencyFormatter =
    new Intl.NumberFormat(
      'es-MX',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );

  constructor(
    private fb: FormBuilder,

    private dialogRef:
      MatDialogRef<ProductFormComponent>,

    private familyService:
      FamilyService,

    @Inject(MAT_DIALOG_DATA)
    public data: ProductFormData,
  ) {
    this.isEditMode =
      data.mode === 'edit';
  }

  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {
    this.familyService
      .getFamilies()
      .subscribe({
        next: (families) => {
          this.families =
            families.filter(
              (family) =>
                family.isActive,
            );

          this.initializeForm();
        },

        error: () => {
          this.families = [];

          this.initializeForm();
        },
      });

    // Cuando cambia familia:
    // limpiar línea y filtrar catálogo.
    this.form
      .get('familyId')
      ?.valueChanges
      .subscribe(
        (familyId) => {
          this.filterLines(
            familyId,
          );
        },
      );
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.refreshCurrencyInputs();
    });
  }

  // =====================================================
  // INICIALIZAR EDIT / CREATE
  // =====================================================

  private initializeForm(): void {
    if (
      this.isEditMode &&
      this.data.product
    ) {
      const product =
        this.data.product;

      // Obtenemos la familia REAL
      // a partir de LineId.
      const currentLine =
        this.data.lines.find(
          (line) =>
            line.id ===
            product.lineId,
        );

      const familyId =
        currentLine?.familyId ??
        null;

      this.filterLines(
        familyId,
      );

      this.form.patchValue(
        {
          code:
            product.code,

          description:
            product.description,

          barras:
            product.barras ??
            '',

          familyId,

          lineId:
            product.lineId,

          type:
            this.normalizeType(
              product.type,
            ),

          unit:
            product.unit,

          pesable:
            product.pesable ??
            'NO',

          min:
            product.min,

          max:
            product.max,

          costo:
            product.costo ??
            null,

          precio:
            product.precio ??
            null,

          partida:
            product.partida ??
            '',

          criterio:
            product.criterio ??
            '',

          clase:
            product.clase ??
            '',

          tipoEgreso:
            product.tipoEgreso ??
            '',
        },
        {
          emitEvent: false,
        },
      );

      this.filterLines(
        familyId,
      );

      setTimeout(() => {
        this.refreshCurrencyInputs();
      });

      return;
    }

    // CREATE
    this.filteredLines = [];
  }

  // =====================================================
  // FAMILIA / LÍNEAS
  // =====================================================

  private filterLines(
    familyId:
      | number
      | null
      | undefined,
  ): void {
    if (!familyId) {
      this.filteredLines = [];

      return;
    }

    this.filteredLines =
      this.data.lines
        .filter(
          (line) =>
            line.familyId ===
            familyId,
        )
        .sort(
          (a, b) =>
            a.description.localeCompare(
              b.description,
            ),
        );
  }

  onFamilyChanged(
    familyId: number,
  ): void {
    this.filterLines(
      familyId,
    );

    this.form
      .get('lineId')
      ?.setValue(null);
  }

  // =====================================================
  // NORMALIZAR TIPO
  // =====================================================

  private normalizeType(
    type:
      | string
      | number
      | null
      | undefined,
  ): string {
    if (!type) {
      return 'PRODUCTO';
    }

    if (
      typeof type === 'number'
    ) {
      return type === 1
        ? 'USO_INTERNO'
        : 'PRODUCTO';
    }

    const normalized =
      type
        .toUpperCase()
        .replace(
          /\s+/g,
          '_',
        );

    if (
      normalized.includes(
        'USO',
      )
    ) {
      return 'USO_INTERNO';
    }

    return 'PRODUCTO';
  }

  // =====================================================
  // MONEDA
  // =====================================================

  private toNumber(
    value:
      | string
      | number
      | null
      | undefined,
  ): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    if (
      typeof value ===
      'number'
    ) {
      return Number.isNaN(
        value,
      )
        ? null
        : value;
    }

    const cleanValue =
      value
        .replace(
          /[^0-9.,-]/g,
          '',
        )
        .replace(
          /,/g,
          '',
        );

    if (!cleanValue) {
      return null;
    }

    const parsed =
      Number(cleanValue);

    return Number.isNaN(
      parsed,
    )
      ? null
      : parsed;
  }

  private formatMoney(
    value:
      | number
      | null
      | undefined,
  ): string {
    if (
      value === null ||
      value === undefined
    ) {
      return '';
    }

    return (
      '$' +
      this.currencyFormatter
        .format(value)
    );
  }

  private refreshCurrencyInputs(): void {
    if (
      this.costoInput
    ) {
      this.costoInput
        .nativeElement
        .value =
        this.formatMoney(
          this.form
            .get('costo')
            ?.value,
        );
    }

    if (
      this.precioInput
    ) {
      this.precioInput
        .nativeElement
        .value =
        this.formatMoney(
          this.form
            .get('precio')
            ?.value,
        );
    }
  }

  onCurrencyFocus(
    controlName:
      | 'costo'
      | 'precio',
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const value =
      this.form
        .get(controlName)
        ?.value;

    input.value =
      value === null ||
      value === undefined
        ? ''
        : String(value);
  }

  onCurrencyInput(
    controlName:
      | 'costo'
      | 'precio',
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const numericValue =
      this.toNumber(
        input.value,
      );

    this.form
      .get(controlName)
      ?.setValue(
        numericValue,
        {
          emitEvent: false,
        },
      );
  }

  onCurrencyBlur(
    controlName:
      | 'costo'
      | 'precio',
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const numericValue =
      this.toNumber(
        input.value,
      );

    this.form
      .get(controlName)
      ?.setValue(
        numericValue,
      );

    input.value =
      this.formatMoney(
        numericValue,
      );
  }

  // =====================================================
  // CANCEL
  // =====================================================

  cancel(): void {
    this.dialogRef.close();
  }

  // =====================================================
  // SAVE
  // =====================================================

  save(): void {
    if (
      this.form.invalid
    ) {
      this.form
        .markAllAsTouched();

      return;
    }

    const value =
      this.form
        .getRawValue();

    const min =
      Number(
        value.min ?? 0,
      );

    const max =
      Number(
        value.max ?? 0,
      );

    if (min > max) {
      this.form
        .get('max')
        ?.setErrors({
          minGreaterThanMax:
            true,
        });

      return;
    }

    if (
      !value.familyId
    ) {
      return;
    }

    if (
      !value.lineId
    ) {
      return;
    }

    const selectedFamily =
      this.families.find(
        (family) =>
          family.id ===
          value.familyId,
      );

    if (!selectedFamily) {
      return;
    }

    const selectedLine =
      this.data.lines.find(
        (line) =>
          line.id ===
            value.lineId &&
          line.familyId ===
            value.familyId,
      );

    if (!selectedLine) {
      return;
    }

    this.dialogRef.close({
      code:
        value.code.trim() ||
        null,

      description:
        value.description
          .trim(),

      barras:
        value.barras
          .trim() ||
        null,

      lineId:
        selectedLine.id,

      // Family de CatalogFamilies.
      family:
        selectedFamily
          .description,

      type:
        value.type,

      unit:
        value.unit.trim(),

      pesable:
        value.pesable,

      min,

      max,

      costo:
        value.costo ===
          null
          ? null
          : Number(
              value.costo,
            ),

      precio:
        value.precio ===
          null
          ? null
          : Number(
              value.precio,
            ),

      partida:
        value.partida
          .trim() ||
        null,

      criterio:
        value.criterio
          .trim() ||
        null,

      clase:
        value.clase
          .trim() ||
        null,

      tipoEgreso:
        value.tipoEgreso
          .trim() ||
        null,
    });
  }
}