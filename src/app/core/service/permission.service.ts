import { Injectable } from '@angular/core';
import { PermissionCategory } from '../models/permission-category.model';
import { Permission } from '../models/permissions.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PermissionService {

  constructor(private http: HttpClient) {}

  getCategories(): Observable<PermissionCategory[]> {
    return this.http.get<PermissionCategory[]>('/api/permissions/categories');
  }

  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>('/api/permissions');
  }

  getPermissionsByRole(roleId: number): Observable<Permission[]> {
    return this.http.get<Permission[]>(`/api/permissions/role/${roleId}`);
  }

  private permissions: string[] = [];

  setPermissions(perms: string[]) {
    this.permissions = perms;
      localStorage.setItem('carsug_permissions', JSON.stringify(perms));
    }

    has(permission: string): boolean {
      if (!this.permissions.length) {
        this.permissions = JSON.parse(
          localStorage.getItem('carsug_permissions') || '[]'
        );
      }

      return this.permissions.includes(permission);
    }

  getStoredPermissions(): string[] {
    return JSON.parse(localStorage.getItem('carsug_permissions') || '[]');
  }
}
