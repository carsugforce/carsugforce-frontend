import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DispatchSummaryItem {
  productId: number;
  producto: string;
  solicitado: number;
  enviado: number;
  pendiente: number;
  desabasto: number | null;
  family: string;
  line: string;
}

export interface ConfirmDispatchSummaryData {
  action: 'Dispatch' | 'Complete';
  summary: DispatchSummaryItem[];
}

interface SummaryViewGroup {
  family: string;
  lines: {
    line: string;
    items: DispatchSummaryItem[];
  }[];
}

@Component({
  selector: 'app-confirm-dispatch-summary',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './confirm-dispatch-summary.component.html',
  styleUrls: ['./confirm-dispatch-summary.component.scss']
})
export class ConfirmDispatchSummaryComponent implements OnInit {

  viewModel: SummaryViewGroup[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDispatchSummaryData,
    private dialogRef: MatDialogRef<ConfirmDispatchSummaryComponent>
  ) {}

  ngOnInit(): void {
    this.buildViewModel();
   
  }

   buildViewModel(): void {
    const grouped = new Map<string, Map<string, DispatchSummaryItem[]>>();

    this.data.summary.forEach(item => {
      if (!grouped.has(item.family)) {
        grouped.set(item.family, new Map());
      }

      const family = grouped.get(item.family)!;

      if (!family.has(item.line)) {
        family.set(item.line, []);
      }

      family.get(item.line)!.push(item);
    });

    this.viewModel = Array.from(grouped.entries()).map(([family, lines]) => ({
      family,
      lines: Array.from(lines.entries()).map(([line, items]) => ({
        line,
        items
      }))
    }));

    
  }

  confirm(): void {
    //console.log('Confirming dispatch with data:', this.data); 
    const dispatchItems = this.data.summary
      .filter(i => i.enviado > 0 )
      .map(i => ({
        productId: i.productId,
        qty: i.enviado
      }));

    const outOfStockItems = this.data.summary
      .filter(i => i.desabasto !== null)
      .map(i => ({
        productId: i.productId,
        qty: i.desabasto ?? 0
      })); 

      //console.log(outOfStockItems)

   this.dialogRef.close({
      action: this.data.action,
      payload: {
        dispatchItems,
        outOfStockItems
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
