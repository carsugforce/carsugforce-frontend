import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PecalProduct } from '../models/pecalproduct.model';
import { Line } from '../models/line.model';
import { PecalOrderList } from '../models/pecal-order-list.model';
import { PecalOrderStatus } from '../models/pecal-order-status';
import { PecalOrderDetailResponse } from '../models/pecal-order-detail-response';
import { OrderPickingItem } from '../models/order-picking-item.model';
import { DispatchHistoryItem } from '../models/dispatch-history.model';
import { PendingDispatch } from '../models/pending-dispatch.model';
import { DispatchDetailResponse } from '../models/dispatch-detail.model';
import { ConfirmDispatchReceptionDto } from '../models/confirm-dispatch-reception';
import { PecalOrderEdit } from '../models/pecal-order-edit';
import { OrderHistoryEvent } from '../models/order-history-event.model';



@Injectable({
  providedIn: 'root'
})
export class PecalService {

  private readonly baseUrl = `${environment.apiUrl}/pecal`;

  constructor(private http: HttpClient) {}

  /* ============================
     CATÁLOGOS
  ============================ */

  getPecalProducts(): Observable<PecalProduct[]> {
    return this.http.get<PecalProduct[]>(`${this.baseUrl}/products`);
  }

  getLines(): Observable<Line[]> {
    return this.http.get<Line[]>(`${this.baseUrl}/getlines`);
  }

  /* ============================
     PEDIDOS SUCURSAL
  ============================ */

  sendOrder(payload: any) {
    return this.http.post(
      `${this.baseUrl}/orders/send`,
      payload
    );
  }

  getMyOrders() {
    return this.http.get<PecalOrderList[]>(
      `${this.baseUrl}/orders/mine`
    );
  }

  getOrdersForWarehouse() {
    return this.http.get<PecalOrderList[]>(
      `${this.baseUrl}/orders/warehouse`
    );
  }


  getOrderDetail(orderId: number): Observable<PecalOrderDetailResponse> {
    return this.http.get<PecalOrderDetailResponse>(
      `${this.baseUrl}/orders/detail/${orderId}`
    );
  }

  updateOrderStatus(orderId: number, status: PecalOrderStatus) {
    return this.http.put(
      `${this.baseUrl}/${orderId}/status`,
      { status }
    );
  }

  /* ============================
     DESPACHOS (ALMACÉN)
  ============================ */

  /**  CREA / OBTIENE despacho abierto */
  startDispatch(orderId: number) {
    return this.http.post<{ dispatchId: number }>(
      `${this.baseUrl}/orders/${orderId}/dispatch/start`,
      {}
    );
  }



  /**  GUARDA ITEMS DEL DESPACHO */
  saveDispatchItems(
    dispatchId: number,
    items: { productId: number; qty: number }[]
  ) {
    return this.http.post(
      `${this.baseUrl}/dispatch/${dispatchId}/items`,
      items
    );
  }

  /**  CIERRA DESPACHO */
  closeDispatch(dispatchId: number) {
    return this.http.post(
      `${this.baseUrl}/dispatch/${dispatchId}/close`,
      {}
    );
  }

  getPickingItems(orderId: number) {
    return this.http.get<OrderPickingItem[]>(
      `${this.baseUrl}/orders/${orderId}/picking-items`
    );
  }

  getDispatchHistory(orderId: number): Observable<DispatchHistoryItem[]> {
    return this.http.get<DispatchHistoryItem[]>(
      `${this.baseUrl}/orders/${orderId}/dispatch-history`
    );
  }

  // models

  getPendingDispatches(orderId: number) {
    return this.http.get<PendingDispatch[]>(
      `${this.baseUrl}/orders/${orderId}/pending-dispatches`
    );
  }

  getDispatchDetail(dispatchId: number) {
      return this.http.get<DispatchDetailResponse>(
        `${this.baseUrl}/dispatches/detail/${dispatchId}`
      );
    }


  confirmDispatchReception(
      dispatchId: number,
      body: ConfirmDispatchReceptionDto
    ) {
      return this.http.post(
        `${this.baseUrl}/dispatches/${dispatchId}/confirm-reception`,
        body
      );
  }


    markItemOutOfStock(dispatchId: number, items: { productId: number; qty: number }[]) {
      return this.http.post(
        `${this.baseUrl}/dispatch/${dispatchId}/items/out-of-stock`,
        items
      );
    }


    startDispatchFlag(orderId: number) {
      return this.http.post(
        `${this.baseUrl}/orders/${orderId}/start-dispatch`,
        {}
      );
    }


    getOrderForEdit(orderId: number) {
      return this.http.get<PecalOrderEdit>(
        `${this.baseUrl}/orders/${orderId}/edit`
      );
    }

    updateOrder(orderId: number, payload: any) {
      return this.http.put(
        `${this.baseUrl}/orders/${orderId}`,
        payload
      );
    }


    getOrderHistory(orderId: number): Observable<OrderHistoryEvent[]> {
      return this.http.get<OrderHistoryEvent[]>(
        `${this.baseUrl}/orders/${orderId}/history`
      );
    }

    getMissingItems(orderId: number) {
      return this.http.get<any[]>(
        `${this.baseUrl}/orders/${orderId}/missing-items`
      );
    }
   
   

    addMissingItems(
      orderId: number,
      payload: {
        items: {
          productId: number;
          qty: number;
          observations: string;
        }[];
      }
    ) {
      return this.http.post(
        `${this.baseUrl}/orders/${orderId}/add-missing`,
        payload
      );
    }


    canEditOrder(orderId: number) {
      return this.http.get<{
        canEdit: boolean;
        startDispatching: number;
        openAt: string | null;
        status: string;
      }>(`${this.baseUrl}/orders/${orderId}/can-edit`);
    }







  



}

      
  
