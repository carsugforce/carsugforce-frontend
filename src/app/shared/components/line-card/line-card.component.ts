import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Line } from '../../../core/models/line.model';
import { MatIconModule } from "@angular/material/icon";

@Component({
  standalone: true,
  selector: 'app-line-card',
  templateUrl: './line-card.component.html',
  styleUrls: ['./line-card.component.scss'],
  imports: [
    CommonModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatIconModule
]
})
export class LineCardComponent {

  // ============================
  // INPUT
  // ============================
    @Input() line!: Line;


  // ============================
  // OUTPUTS
  // ============================
  @Output() toggle = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();
  @Output() remove = new EventEmitter<any>();
  @Output() viewProducts = new EventEmitter<any>();

  

  // ============================
  // ACTIONS (MAQUETA)
  // ============================
  onToggle(): void {
    this.toggle.emit(this.line);
  }

  onEdit(): void {
    this.edit.emit(this.line);
  }

  onRemove(): void {
    this.remove.emit(this.line);
  }

  onViewProducts(): void {
    this.viewProducts.emit(this.line);
  }
  
}
