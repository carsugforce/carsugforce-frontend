import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { Console } from 'console';

@Component({
  selector: 'app-product-cell',
  styleUrls: ['./product-cell.component.scss'],
  standalone:true,
  imports: [CommonModule],
  template: `
    <div class="product-cell">
      <div class="product-name">{{ value }}</div>

      <div class="product-line"
        *ngIf="isMobile">
        {{ line }}
      </div>
    </div>
  `
})
export class ProductCellComponent
  implements ICellRendererAngularComp {

  value!: string;
  line!: string;
  isMobile = false;

  agInit(params: any): void {
    this.value = params.value;
    this.line = params.data?.lineName;
    
    this.isMobile = params.context?.isMobile ?? false;
    //console.log(this.isMobile )
  }

  refresh(): boolean {
    return false;
  }

  


}
