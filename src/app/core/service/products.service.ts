import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Product } from '../models/product.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {

  private readonly apiUrl = `${environment.apiUrl}/catalogs/products`;

  constructor(private http: HttpClient) {}

  // ============================
  // GET ALL
  // ============================
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  // ============================
  // CREATE
  // ============================
  createProduct(payload: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, payload);
  }

  // ============================
  // UPDATE
  // ============================
  updateProduct(id: number, payload: Partial<Product>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, payload);
  }

  // ============================
  // DELETE
  // ============================
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
