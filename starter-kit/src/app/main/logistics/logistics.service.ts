import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

export interface LogisticsRoute {
  id: number;
  routeNo: string;
  routeName: string;
  routeDate: string;
  driverId?: number;
  driverName?: string;
  vehicleId?: number;
  vehicleNo?: string;
  status: string;
  stopCount: number;
  deliveredCount: number;
}

export interface LogisticsStop {
  id: number;
  routeId: number;
  deliveryOrderId: number;
  deliveryOrderNo?: string;
  customerName?: string;
  deliveryAddress?: string;
  stopSequence: number;
  status: string;
  deliveredAt?: string;
  receiverName?: string;
  receiverMobile?: string;
  remarks?: string;
}

export interface AvailableDelivery {
  id: number;
  deliveryOrderNo?: string;
  doDate?: string;
  customerName?: string;
  deliveryAddress?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class LogisticsService {
  private readonly baseUrl = `${environment.apiUrl}/Logistics`;

  constructor(private http: HttpClient) {}

  getRoutes(filters: { routeDate?: string; status?: string }): Observable<LogisticsRoute[]> {
    let params = new HttpParams();
    if (filters.routeDate) {
      params = params.set('routeDate', filters.routeDate);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    return this.http.get<any>(`${this.baseUrl}/routes`, { params }).pipe(map(res => res?.data || res || []));
  }

  getStops(routeId: number): Observable<LogisticsStop[]> {
    return this.http.get<any>(`${this.baseUrl}/routes/${routeId}/stops`).pipe(map(res => res?.data || res || []));
  }

  getAvailableDeliveries(deliveryDate?: string): Observable<AvailableDelivery[]> {
    let params = new HttpParams();
    if (deliveryDate) {
      params = params.set('deliveryDate', deliveryDate);
    }
    return this.http.get<any>(`${this.baseUrl}/available-deliveries`, { params }).pipe(map(res => res?.data || res || []));
  }

  createRoute(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/routes`, payload).pipe(map(res => res?.data || res));
  }

  startRoute(routeId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/routes/${routeId}/start`, {}).pipe(map(res => res?.data || res));
  }

  updatePod(stopId: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/stops/${stopId}/pod`, payload).pipe(map(res => res?.data || res));
  }

  getDrivers(): Observable<any[]> {
    return this.http.get<any>(`${environment.apiUrl}/Driver/GetAllDriver`).pipe(map(res => res?.data || res || []));
  }

  getVehicles(): Observable<any[]> {
    return this.http.get<any>(`${environment.apiUrl}/Vehicle/GetVehicles`).pipe(map(res => res?.data || res || []));
  }
}
