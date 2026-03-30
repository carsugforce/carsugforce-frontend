import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Family } from '../models/model.family';

@Injectable({
  providedIn: 'root'
})
export class FamilyService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/catalogs/families`;

  getFamilies(): Observable<Family[]> {
    return this.http.get<Family[]>(this.baseUrl);
  }

  createFamily(payload: { description: string }): Observable<Family> {
    return this.http.post<Family>(this.baseUrl, payload);
  }

  updateFamily(id: number, payload: { description: string; isActive: boolean }): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, payload);
  }

  deleteFamily(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}