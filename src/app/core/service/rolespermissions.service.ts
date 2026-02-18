import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Permission } from '../models/permissions.model';

@Injectable({
  providedIn: 'root'
})
export class Rolespermissions {

  private apiPerms = `${environment.apiUrl}/permissions`;
  private apiCategories = `${environment.apiUrl}/permissions/categories`;

  constructor(private http: HttpClient) {}

  // ============================================================
  // 1) Obtener categorías reales desde el backend
  // ============================================================
  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(this.apiCategories);
  }

  // ============================================================
  // 2) Obtener permisos de un rol (o todos)
  // ============================================================
  getPermissionsByRole(roleId?: number): Observable<Permission[]> {
    if (roleId != null) {
      return this.http.get<Permission[]>(
        `${this.apiPerms}?roleId=${roleId}`
      );
    }

    // Si no se manda roleId, regresa TODOS los permisos
    return this.http.get<Permission[]>(this.apiPerms);
  }

  // ============================================================
  // 3) (Opcional) obtener TODOS los permisos sin roleId
  // ============================================================
  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(this.apiPerms);
  }

}
