import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-product-actions-renderer',
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="grid-actions">
      <button class="grid-icon edit" (click)="edit()">
        <mat-icon>edit</mat-icon>
      </button>

      <button class="grid-icon delete" (click)="delete()">
        <mat-icon>delete</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .grid-actions {
      display: flex;
      justify-content: center;
      gap: 8px;
    }

    .grid-icon {
      background: transparent;
      border: none;
      cursor: pointer;
      color: #9ca3af;
      padding: 6px;
      border-radius: 50%;
      height:40px;
      width:40px;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    .grid-icon.edit:hover,
      .grid-icon.delete:hover {
        background-color: rgba(82, 78, 79, 0.20);
        color: #881137 !important;
      }

    .grid-icon.edit:hover {
      color: #881137 !important;
    }

    .grid-icon.delete:hover {
      color: #881137 !important;
    }

    mat-icon {
      font-size: 25px;
    }
  `]
})
export class ProductActionsRendererComponent
  implements ICellRendererAngularComp {

  private params: any;

  agInit(params: any): void {
    this.params = params;
  }

  refresh(): boolean {
    return false;
  }

  edit(): void {
    this.params.context.componentParent.openEditProduct(this.params.data);
  }

  delete(): void {
    this.params.context.componentParent.confirmDelete(this.params.data);
  }
}
