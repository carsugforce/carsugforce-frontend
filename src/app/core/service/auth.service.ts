import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/Auth`;

  constructor(private http: HttpClient) {}

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  getDarkModeFromToken(): boolean {
    const token = this.getToken();
    if (!token) return false;

    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.darkmode === 'True' || payload.darkmode === 'true';
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${this.apiUrl}/login`,
        { email, password },
        //{ withCredentials: true }
      )
      .pipe(
        tap((res) => {
          if (this.isBrowser()) {
            localStorage.setItem('carsug_token', res.token);
          }
        }),
      );
  }

  logout(): void {
    if (this.isBrowser()) {
      localStorage.removeItem('carsug_token');
    }
  }

  getToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem('carsug_token');
  }

  // ============================================================
  // Decodificar JWT
  // ============================================================
  private decodeToken(token: string): any | null {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  // ============================================================
  // Validar si el token expiró
  // ============================================================
  private isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const now = Date.now() / 1000;
    return decoded.exp < now;
  }

  // ============================================================
  // Saber si el usuario está autenticado REALMENTE
  // ============================================================
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    if (this.isTokenExpired(token)) {
      this.logout(); // limpiar token expirado
      return false;
    }

    return true;
  }

  hasPermission(permission: string): boolean {
    const permissions = this.getPermissions();

    return permissions.includes(permission);
  }

  hasAnyPermission(permissionsToCheck: string[]): boolean {
    const permissions = this.getPermissions();

    return permissionsToCheck.some((permission) =>
      permissions.includes(permission),
    );
  }

  private getPermissions(): string[] {
    const token = localStorage.getItem('token');

    if (!token) return [];

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      const rawPermissions =
        payload.permission ||
        payload.permissions ||
        payload.Permission ||
        payload.Permissions ||
        [];

      if (Array.isArray(rawPermissions)) {
        return rawPermissions;
      }

      if (typeof rawPermissions === 'string') {
        return [rawPermissions];
      }

      return [];
    } catch {
      return [];
    }
  }
}
