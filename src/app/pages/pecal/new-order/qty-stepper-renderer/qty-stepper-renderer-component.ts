import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-qty-stepper-renderer',
  imports: [CommonModule],
  templateUrl: './qty-stepper-renderer.component.html',
  styleUrls: ['./qty-stepper-renderer.component.scss']
})
export class QtyStepperRendererComponent
  implements ICellRendererAngularComp {

  params!: any;
  product!: any;
  parent!: any;

  isEditing = false;
  draftQty = 0;
  qty = 0;
  isOutOfStock = false;
  missingItems= 0;

  agInit(params: any): void {
   
   this.params = params;
   this.product = params.data;
   this.parent = params.context.componentParent;
   this.isOutOfStock = !!params.data?.isOutOfStock;
   this.missingItems= this.params.data.pendingQty
    
  }

  refresh(): boolean {
    return false;
  }

  isCanal(): boolean {
    return this.product?.description
      ?.toLowerCase()
      .includes('canal');
  }

  get step(): number {
    return this.isCanal() ? 0.5 : 1;
  }

  // =====================
  // STEPPER
  // =====================
  increase() {
    const current = this.product.qty ?? 0;
    const next = +(current + this.step).toFixed(2);

    this.parent.onQtyInput(this.product, String(next));
    this.draftQty = next;
  }

  decrease() {
    const current = this.product.qty ?? 0;
    const next = current - this.step;

    if (next < 0) return;

    const value = +next.toFixed(2);
    this.parent.onQtyInput(this.product, String(value));
    this.draftQty = value;
  }

  // =====================
  // EDIT MODE
  // =====================
  startEdit() {
    this.isEditing = true;
   
    this.draftQty = this.product.qty;
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    let value = Number(input.value);
    if (isNaN(value) || value < 0) value = 0;

    value = this.isCanal()
      ? Math.round(value * 2) / 2   // fuerza .5
      : Math.round(value);          // enteros

    this.draftQty = value;
  }


  commit() {
    this.isEditing = false;

    this.parent.onQtyInput(
      this.product,
      String(this.draftQty)
    );

    this.draftQty = this.product.qty;
  }

  // =====================
  // BLOQUEO AG GRID
  // =====================
  stop(event: Event) {
    event.stopPropagation();
  }
}