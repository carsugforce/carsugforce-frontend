import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SuppliersService } from '../../core/service/suppliers.service';
import { Suppliers } from '../../core/models/suppliers.model';

@Component({
  selector: 'app-supplier-search-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './supplier-search-dialog.component.html',
  styleUrl: './supplier-search-dialog.component.scss'
})
export class SupplierSearchDialogComponent implements OnInit {
  private suppliersService = inject(SuppliersService);
  private dialogRef = inject(MatDialogRef<SupplierSearchDialogComponent>);

  searchCtrl = new FormControl('');

  suppliers: Suppliers[] = [];
  filteredSuppliers: Suppliers[] = [];

  loading = false;

  ngOnInit(): void {
    this.loadSuppliers();

    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(150),
        distinctUntilChanged()
      )
      .subscribe(value => {
        this.filterSuppliers(value ?? '');
      });
  }

  loadSuppliers(): void {
    this.loading = true;

    this.suppliersService.getSuppliers()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: res => {
          this.suppliers = res.items ?? [];
          this.filteredSuppliers = [...this.suppliers];
        },
        error: () => {
          this.suppliers = [];
          this.filteredSuppliers = [];
        }
      });
  }

  filterSuppliers(value: string): void {
    const term = value.trim().toLowerCase();

    if (!term) {
      this.filteredSuppliers = [...this.suppliers];
      return;
    }

    this.filteredSuppliers = this.suppliers.filter(s => {
      const text = [
        s.name,
        s.rfc,
        s.phone,
        s.email,
        s.municipality,
        s.state,
        s.paymentCondition,
        s.fiscalRegime
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(term);
    });
  }

  selectSupplier(supplier: Suppliers): void {
    this.dialogRef.close(supplier);
  }

  close(): void {
    this.dialogRef.close(null);
  }
}