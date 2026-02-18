import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ICellRendererAngularComp } from 'ag-grid-angular';

@Component({
  standalone: true,
  selector: 'app-observations-renderer',
  imports: [CommonModule, FormsModule],
  template: `
     <textarea
        class="obs-text"
        [value]="value"
        (mousedown)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        (keyup)="$event.stopPropagation()"
        (input)="onChange($event)"
        maxlength="150"
        placeholder="Máx 150 caracteres">
        </textarea>

  `,
  styles: [`
    .obs-text {
      margin-top:10px;
      width: 95%;
      min-height: 45px;
      resize: none;
      padding: 6px 8px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: inherit;
      outline: none;
    }
  `]
})
export class ObservationsRendererComponent implements ICellRendererAngularComp {
  private params: any;
  value = '';

  agInit(params: any): void {
    this.params = params;
    this.value = params.data?.observations ?? '';
  }

  refresh(params: any): boolean {
    this.params = params;
    this.value = params.data?.observations ?? '';
    return true;
  }

    onChange(event: Event) {
        const v = (event.target as HTMLTextAreaElement).value;
        this.value = v;
        this.params.data.observations = v;
        }

}
