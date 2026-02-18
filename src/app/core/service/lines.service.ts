import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Line } from '../models/line.model';


@Injectable({
  providedIn: 'root'
})
export class LinesService {

  private readonly apiUrl = `${environment.apiUrl}/catalogs/lines`;

  constructor(private http: HttpClient) {}

  getLines(): Observable<Line[]> {
    return this.http.get<Line[]>(this.apiUrl);
  }

  createLine(payload: { description: string }) {
    return this.http.post<Line>(this.apiUrl, payload);
  }

  updateLine(id: number, payload: { description: string; isActive: boolean }) {
    return this.http.put<void>(`${this.apiUrl}/${id}`, payload);
  }

    deleteLine(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }



}
