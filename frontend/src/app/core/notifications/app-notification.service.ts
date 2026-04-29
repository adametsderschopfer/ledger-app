import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class AppNotificationService {
  private readonly snackBar = inject(MatSnackBar);
  private lastMessage = '';
  private lastShownAt = 0;

  success(message: string): void {
    this.open(message, 3200);
  }

  error(message: string): void {
    this.open(message, 4400);
  }

  private open(message: string, duration: number): void {
    const now = Date.now();
    if (this.lastMessage === message && now - this.lastShownAt < 1600) {
      return;
    }

    this.lastMessage = message;
    this.lastShownAt = now;
    this.snackBar.open(message, undefined, {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
  }
}
