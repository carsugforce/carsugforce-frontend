import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Role } from '../models/role.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RolesService {

  private api = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) {}

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.api);
  }

  getRoleById(id: number): Observable<Role> {
    return this.http.get<Role>(`${this.api}/${id}`);
  }

  createRole(role: Role): Observable<any> {
    return this.http.post(this.api, role);
  }

  updateRole(role: Role): Observable<any> {
    return this.http.put(`${this.api}/${role.id}`, role);
  }

  deleteRole(id: number): Observable<any> {
    return this.http.delete(`${this.api}/${id}`);
  }
}
