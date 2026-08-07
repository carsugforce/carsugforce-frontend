import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Product,
  ProductImportRow,
  ProductImportResponse,
} from '../models/product.models';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly apiUrl =
    `${environment.apiUrl}/catalogs/products`;

  constructor(
    private http: HttpClient,
  ) {}

  // ============================
  // GET ALL
  // ============================

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(
      this.apiUrl,
    );
  }

  // ============================
  // CREATE
  // ============================

  createProduct(
    payload: Partial<Product>,
  ): Observable<any> {
    return this.http.post(
      this.apiUrl,
      payload,
    );
  }

  // ============================
  // UPDATE
  // ============================

  updateProduct(
    id: number,
    payload: Partial<Product>,
  ): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${id}`,
      payload,
    );
  }

  // ============================
  // DELETE
  // ============================

  deleteProduct(
    id: number,
  ): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${id}`,
    );
  }

  // ============================
  // IMPORTAR CATÁLOGO COMPLETO
  // ============================
  //
  // PLANCHA:
  //
  // code
  // description
  // Barras
  // lineName
  // type
  // unit
  // Pesable
  // min
  // max
  // visibility
  // Family
  // Costo
  // Precio
  // PARTIDA
  // CRITERIO
  // CLASE
  // TIPO EGRESO
  //
  // ============================

  importProducts(
    data: ProductImportRow[],
  ): Observable<ProductImportResponse> {
    return this.http.post<ProductImportResponse>(
      `${this.apiUrl}/import`,
      data,
    );
  }

  // ============================
  // ACTUALIZAR VISIBILIDAD PECAL
  // ============================

  updatePecalVisibility(
    productId: number,
    isVisibleInPecal: boolean,
  ): Observable<void> {
    return this.http.patch<void>(
      `${this.apiUrl}/${productId}/pecal-visibility`,
      {
        isVisibleInPecal,
      },
    );
  }

  // ============================
  // IMPORTACIÓN SOLO VISIBILIDAD
  // ============================
  //
  // Lo dejamos porque ya existe
  // tu endpoint y no rompe nada.
  //
  // ============================

  importPecalVisibility(
    data: Array<{
      code: string;
      visibility: number;
    }>,
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/import-pecal-visibility`,
      data,
    );
  }
}