import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-order-cart-pecal',
  templateUrl: './order-cart-pecal.component.html',
  styleUrls: ['./order-cart-pecal.component.scss'],
  imports: [CommonModule, MatIconModule, MatButtonModule],
})
export class OrderCartPecalComponent {
  @Input() items: any[] = [];

  @Output() qtyChange = new EventEmitter<{ item: any; qty: number }>();
  @Output() remove = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() saveDraft = new EventEmitter<void>();

  @Input() submitLabel?: string;

  missingItems = 0;

  onQtyBlur(p: any, event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = Number(input.value);
    value = this.normalizeQty(p, value);

    this.qtyChange.emit({ item: p, qty: value });
    p.editing = false;
   
  }

  emitQty(p: any, qty: number): void {
    this.qtyChange.emit({ item: p, qty });
  }

  removeItem(p: any): void {
    this.remove.emit(p);
  }

  onSaveDraftClick(): void {
    this.saveDraft.emit();
  }

  onSubmitClick(): void {
    this.submit.emit();
  }

  get groupedItems() {
    const groups: Record<string, any[]> = {};

    for (const item of this.items) {
      const key = item.lineName || 'Sin categoría';

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(item);
    }

    return Object.entries(groups).map(([lineName, items]) => ({
      lineName,
      items,
    }));
  }

  isCanal(p: any): boolean {
  return p?.description?.toLowerCase().includes('canal');
  }

  getStep(p: any): number {
    return this.isCanal(p) ? 0.5 : 1;
  }

  normalizeQty(p: any, value: number): number {
    if (isNaN(value) || value < 0) return 0;

    return this.isCanal(p)
      ? Math.round(value * 2) / 2  
      : Math.round(value);          
  }


  increase(p: any): void {
  const step = this.getStep(p);
  const next = this.normalizeQty(p, (p.committedQty ?? 0) + step);

    this.qtyChange.emit({ item: p, qty: next });
  }

  decrease(p: any): void {
    const step = this.getStep(p);
    const next = (p.committedQty ?? 0) - step;

    if (next < 0) return;

    this.qtyChange.emit({
      item: p,
      qty: this.normalizeQty(p, next)
    });
  }




  
}
