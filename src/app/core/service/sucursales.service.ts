import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sucursal } from '../models/sucursal.models';
import { environment } from '../../../environments/environment';
import { SucursalSimple } from '../models/sucursalsimple.model';

@Injectable({ providedIn: 'root' })
export class SucursalService {
  private readonly apiUrl = `${environment.apiUrl}/Sucursales`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(this.apiUrl);
  }

  getAllSucursalesSimple(): Observable<SucursalSimple[]> {
    return this.http.get<SucursalSimple[]>(this.apiUrl);
  }

  create(payload: Partial<Sucursal>): Observable<void> {
    return this.http.post<void>(this.apiUrl, payload);
  }

  update(id: number, payload: Partial<Sucursal>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, payload);
  }

  toggleStatus(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/toggle-status`, {});
  }
}
