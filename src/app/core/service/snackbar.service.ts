import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export type SnackbarType = 'success' | 'error' | 'warning' | 'info';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {

  constructor(private snackBar: MatSnackBar) {}

  show(
    message: string,
    type: SnackbarType = 'success',
    duration = 5000
  ): void {
    this.snackBar.open(message, 'OK', {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [`snackbar-${type}`]
    });
  }

  success(message: string): void {
    this.show("✅ "+ message, 'success');
  }

  error(message: string): void {
    this.show("⚠️ " + message, 'error', 4000);
  }

  warning(message: string): void {
    this.show("🚨 " + message, 'warning');
  }

   info(message: string): void {
    this.show("ℹ️ "+ message, 'info', 4000);
  }
}
