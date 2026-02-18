import { Component, Inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

import { PecalService } from '../../../core/service/pecal.service';
import {
  FamilyVM,
  MissingItemVM,
  ShowMissingProductsData,
} from '../../../core/models/missing.products';
import { SnackbarService } from '../../../core/service/snackbar.service';

@Component({
  selector: 'app-show-missing-products',
  templateUrl: './show-missing-products.component.html',
  styleUrls: ['./show-missing-products.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
})
export class ShowMissingProductsComponent implements OnInit {
  viewModel: FamilyVM[] = [];
  rawItems: any[] = [];

  constructor(
    private dialogRef: MatDialogRef<ShowMissingProductsComponent>,
    private router: Router,
    private pecalService: PecalService,
    @Inject(MAT_DIALOG_DATA) public data: ShowMissingProductsData,
    private snackbar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.pecalService.getMissingItems(this.data.orderId).subscribe((items) => {
      this.rawItems = items;
      this.viewModel = this.groupByLine(items);
    });
  }

  /* =========================
     VIEW MODEL
  ========================= */

  groupByLine(items: any[]): FamilyVM[] {
    const grouped: Record<string, MissingItemVM[]> = {};

    items.forEach((i) => {
      const line = i.lineName || 'Sin línea';

      if (!grouped[line]) {
        grouped[line] = [];
      }

      grouped[line].push({
        productId: i.productId,
        producto: i.productDescription,
        solicitado: i.requestedQty,
        pendiente: i.pendingQty,
        desabasto: i.isOutOfStock,
      });
    });

    return [
      {
        family: 'Productos pendientes',
        lines: Object.keys(grouped).map((line) => ({
          line,
          items: grouped[line],
        })),
      },
    ];
  }

  /* =========================
     ACTIONS
  ========================= */

  cancel(): void {
    this.dialogRef.close();
  }

  goToAddProducts(): void {
    if (this.data.pendingDispatch > 0) {
       this.snackbar.warning('No puedes agregar productos si hay despachos por validar');
    }
    else{
      //
     const payload = this.viewModel
      .flatMap(f => f.lines)
      .flatMap(l => l.items)
      .filter(i => i.pendiente > 0 || i.desabasto)
       .map(i => ({
         productId: i.productId,
         pendingQty: i.desabasto ? 0 : i.pendiente,
         desabasto: i.desabasto
       }));
      //console.log('VIEW MODEL:', this.viewModel);
      this.dialogRef.close({
        action: 'go-to-edit',
        payload
      });
    }
  }
}
