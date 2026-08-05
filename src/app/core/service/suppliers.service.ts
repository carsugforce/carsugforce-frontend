import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Suppliers } from '../models/suppliers.model';

@Injectable({
  providedIn: 'root'
})
export class SuppliersService {
  private baseUrl = `${environment.apiUrl}/suppliers`;

  constructor(private http: HttpClient) {}

  getSuppliers(): Observable<{ items: Suppliers[]; }> {
    return this.http.get<{ items: Suppliers[]; }>(this.baseUrl);
  }

  createSupplier(payload: Partial<Suppliers>): Observable<any> {
    return this.http.post(this.baseUrl, payload);
  }

  updateSupplier(id: number, payload: Partial<Suppliers>): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, payload);
  }

  deleteSupplier(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  importSuppliers(data: Partial<Suppliers>[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/import`, data);
  }
}