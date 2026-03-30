import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Family } from '../../../core/models/model.family';

@Component({
  standalone: true,
  selector: 'app-family-card',
  templateUrl: './family-card.component.html',
  styleUrls: ['./family-card.component.scss'],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class FamilyCardComponent {
  @Input() family!: Family;

  @Output() toggle = new EventEmitter<Family>();
  @Output() edit = new EventEmitter<Family>();
  @Output() remove = new EventEmitter<Family>();
  @Output() viewLines = new EventEmitter<Family>();

  onToggle(): void {
    this.toggle.emit(this.family);
  }

  onEdit(): void {
    this.edit.emit(this.family);
  }

  onRemove(): void {
    this.remove.emit(this.family);
  }

   onViewLines(): void {
    this.viewLines.emit(this.family);
  }

}