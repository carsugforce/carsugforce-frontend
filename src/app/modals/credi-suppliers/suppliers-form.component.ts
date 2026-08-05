import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HttpClient } from '@angular/common/http';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

export interface Supplier {
  id: number;
  rfc: string;
  name: string;
  vialidad: string;
  street: string;
  externalNumber: string;
  internalNumber: string;
  neighborhood: string;
  zipCode: string;
  municipality: string;
  state: string;
  phone: string;
  email: string;
  paymentCondition: string;
  fiscalRegime: string;
  paymentForm: string;
  cfdiUse: string;
  paymentMethod: string;
  creditDays: number;
}


export interface SupplierFormData {
  mode: 'create' | 'edit';
  supplier?: Supplier;
}


interface MexicoStateMunicipality {
  state: string;
  municipalities: string[];
}  


type MexicoLocationsMap = Record<string, string[]>;


@Component({
  standalone: true,
  selector: 'app-supplier-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    NgxMatSelectSearchModule
  ],
  templateUrl: './suppliers-form.component.html',
  styleUrls: ['./suppliers-form.component.scss']
})

export class SuppliersFormComponent implements OnInit {

  isEditMode = false;
  stateFilterCtrl = this.fb.control('');
  municipalityFilterCtrl = this.fb.control('');
  mexicoLocations: MexicoLocationsMap = {};

  states: string[] = [];
  filteredStates: string[] = [];

  municipalities: string[] = [];
  filteredMunicipalities: string[] = [];

  stateSearch = '';
  municipalitySearch = '';

  availableMunicipalities: string[] = [];


  form = this.fb.group({
    rfc: [''],
    name: ['', [Validators.required, Validators.minLength(3)]],
    vialidad: [''],
    street: [''],
    externalNumber: [''],
    internalNumber: [''],
    neighborhood: [''],
    zipCode: [''],
    municipality: [''],
    state: [''],
    phone: [''],
    email: ['', [Validators.email]],
    paymentCondition: ['CONTADO', Validators.required],
    fiscalRegime: ['601'],
    paymentForm: ['01'],
    cfdiUse: ['G01'],
    paymentMethod: ['PUE'],
    creditDays: [{ value: 0, disabled: true }, [Validators.min(0)]]
  });

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SuppliersFormComponent>,
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: SupplierFormData
  ) {
    this.isEditMode = data.mode === 'edit';
  }

  ngOnInit(): void {
   this.loadMexicoLocations();

   this.stateFilterCtrl.valueChanges.subscribe(value => {
      this.filterStates(value ?? '');
    });

    this.municipalityFilterCtrl.valueChanges.subscribe(value => {
      this.filterMunicipalities(value ?? '');
    });


    if (this.isEditMode && this.data.supplier) {
      this.form.patchValue({
        rfc: this.data.supplier.rfc ?? '',
        name: this.data.supplier.name ?? '',
        vialidad: this.data.supplier.vialidad ?? '',
        street: this.data.supplier.street ?? '',
        externalNumber: this.data.supplier.externalNumber ?? '',
        internalNumber: this.data.supplier.internalNumber ?? '',
        neighborhood: this.data.supplier.neighborhood ?? '',
        zipCode: this.data.supplier.zipCode ?? '',
        municipality: this.data.supplier.municipality ?? '',
        state: this.data.supplier.state ?? '',
        phone: this.data.supplier.phone ?? '',
        email: this.data.supplier.email ?? '',
        paymentCondition: this.normalizePaymentCondition(this.data.supplier.paymentCondition),
        fiscalRegime: this.data.supplier.fiscalRegime ?? '601',
        paymentForm: this.data.supplier.paymentForm ?? '01',
        cfdiUse: this.data.supplier.cfdiUse ?? 'G01',
        paymentMethod: this.data.supplier.paymentMethod ?? 'PUE',
        creditDays: this.data.supplier.creditDays ?? 0
      });
    }

    this.configureCreditDays(this.form.get('paymentCondition')?.value ?? 'CONTADO');

    this.form.get('paymentCondition')?.valueChanges.subscribe(value => {
      this.configureCreditDays(value ?? 'CONTADO');
    });

     

  }

  private configureCreditDays(condition: string): void {
    const creditDaysControl = this.form.get('creditDays');

    if (!creditDaysControl) return;

    if (condition === 'CREDITO') {
      creditDaysControl.enable({ emitEvent: false });
      creditDaysControl.setValidators([Validators.required, Validators.min(1)]);
    } else {
      creditDaysControl.setValue(0, { emitEvent: false });
      creditDaysControl.disable({ emitEvent: false });
      creditDaysControl.setValidators([Validators.min(0)]);
    }

    creditDaysControl.updateValueAndValidity({ emitEvent: false });
  }

  private normalizePaymentCondition(value: string | null | undefined): string {
    const normalized = (value ?? '').trim().toUpperCase();
    return normalized === 'CREDITO' ? 'CREDITO' : 'CONTADO';
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const payload = {
      rfc: this.clean(value.rfc),
      name: this.clean(value.name),
      vialidad: this.clean(value.vialidad),
      street: this.clean(value.street),
      externalNumber: this.clean(value.externalNumber),
      internalNumber: this.clean(value.internalNumber),
      neighborhood: this.clean(value.neighborhood),
      zipCode: this.clean(value.zipCode),
      municipality: this.clean(value.municipality),
      state: this.clean(value.state),
      phone: this.clean(value.phone),
      email: this.clean(value.email),
      paymentCondition: this.clean(value.paymentCondition) ?? 'CONTADO',
      fiscalRegime: this.clean(value.fiscalRegime),
      paymentForm: this.clean(value.paymentForm),
      cfdiUse: this.clean(value.cfdiUse),
      paymentMethod: this.clean(value.paymentMethod),
      creditDays: value.paymentCondition === 'CREDITO'
        ? Number(value.creditDays ?? 0)
        : 0
    };

    this.dialogRef.close(payload);
  }

  private clean(value: string | null | undefined): string | null {
    const cleaned = (value ?? '').trim();
    return cleaned.length ? cleaned : null;
  }


  loadMexicoLocations(): void {
    this.http
      .get<MexicoLocationsMap>('assets/catalogs/mexico-locations.json')
      .subscribe({
        next: (data) => {
          this.mexicoLocations = data ?? {};
          this.states = Object.keys(this.mexicoLocations);
          this.filteredStates = [...this.states];

          const currentState = this.form.get('state')?.value;
          if (currentState) {
            const matchedState = this.states.find(
              x => x.toLowerCase() === String(currentState).toLowerCase()
            );

            if (matchedState) {
              this.form.patchValue({ state: matchedState });
              this.onStateChange(matchedState, false);
            }
          }
        },
        error: (err) => {
          console.error('Error loading mexico locations:', err);
          this.mexicoLocations = {};
          this.states = [];
          this.filteredStates = [];
          this.municipalities = [];
          this.filteredMunicipalities = [];
        }
      });
  }


 onStateChange(state: string, clearMunicipality: boolean = true): void {
    const matchedState = this.states.find(
      x => x.toLowerCase() === String(state).toLowerCase()
    );

    this.municipalities = matchedState
      ? (this.mexicoLocations[matchedState] ?? [])
      : [];

    this.filteredMunicipalities = [...this.municipalities];
    this.municipalitySearch = '';

    if (matchedState && this.form.get('state')?.value !== matchedState) {
      this.form.patchValue({ state: matchedState });
    }

    if (clearMunicipality) {
      this.form.patchValue({ municipality: '' });
    } else {
      const currentMunicipality = this.form.get('municipality')?.value;
      if (currentMunicipality) {
        const matchedMunicipality = this.municipalities.find(
          x => x.toLowerCase() === String(currentMunicipality).toLowerCase()
        );

        if (matchedMunicipality) {
          this.form.patchValue({ municipality: matchedMunicipality });
        }
      }
    }

    this.municipalityFilterCtrl.setValue('', { emitEvent: false });

  }


  //Buscadores

  filterStates(value: string): void {
  const term = (value ?? '').trim().toLowerCase();

  this.filteredStates = this.states.filter(x =>
    x.toLowerCase().includes(term)
  );
  }

  filterMunicipalities(value: string): void {
    const term = (value ?? '').trim().toLowerCase();

    this.filteredMunicipalities = this.municipalities.filter(x =>
      x.toLowerCase().includes(term)
    );
  }

  resetStateSearch(): void {
  this.stateFilterCtrl.setValue('', { emitEvent: false });
  this.filteredStates = [...this.states];
  }

  resetMunicipalitySearch(): void {
    this.municipalityFilterCtrl.setValue('', { emitEvent: false });
    this.filteredMunicipalities = [...this.municipalities];
  }



}