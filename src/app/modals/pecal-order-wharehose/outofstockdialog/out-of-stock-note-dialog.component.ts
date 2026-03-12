import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-out-of-stock-note-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatInputModule],
  templateUrl: './out-of-stock-note-dialog.component.html',
   styleUrls: ['./out-of-stock-note-dialog.component.scss'],
})
export class OutOfStockNoteDialogComponent {

  note = '';
  constructor(
    private dialogRef: MatDialogRef<OutOfStockNoteDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      productName: string
      pendingQty: number
      unit: string
      mode: 'set' | 'remove'
      existingNote?: string
    }
  ) {
     if (data.mode === 'set') {
      this.note = data.existingNote ?? '';
    }
  }

  

  confirm() {
    if (!this.note.trim()) return;
    this.dialogRef.close({
      action: 'update-note',
      note: this.note
    });
  }

  removeOutOfStock() {
    this.dialogRef.close({
      action: 'remove',
      note: this.note.trim() ? this.note : undefined
    });
  }

  cancel() {
    this.dialogRef.close();
  }

}