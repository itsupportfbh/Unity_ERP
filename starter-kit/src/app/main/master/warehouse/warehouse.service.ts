import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { WarehouseApiUrls } from 'Urls/WarehouseAPIUrls';



@Injectable({
    providedIn: 'root'
})
export class WarehouseService {
    private url = environment.apiUrl
    private requestSource = new BehaviorSubject<any>(null);
    currentRequest = this.requestSource.asObservable();
    constructor(private http: HttpClient) { }

    getWarehouse(): Observable<any[]> {
        return this.http.get<any[]>(this.url + WarehouseApiUrls.GetAllWarehouse);
    }

    getWarehouseById(id: any): Observable<any[]> {
        return this.http.get<any[]>(this.url + WarehouseApiUrls.GetWarehouseById + id);
    }

    GetNameByWarehouseAsync(name: any): Observable<any[]> {
        return this.http.get<any[]>(this.url + WarehouseApiUrls.GetNameByWarehouseAsync + name);
    }

    insertWarehouse(data: any): Observable<any> {
        return this.http.post<any>(this.url + WarehouseApiUrls.CreateWarehouse, data);
    }

    updateWarehouse(data: any): Observable<any> {
        return this.http.put<any>(this.url + WarehouseApiUrls.UpdateWarehouse, data);
    }

    deleteWarehouse(id: any) {
        return this.http.delete<any>(this.url + WarehouseApiUrls.DeleteWarehouse + id);
    }
    getBinNameByIdAsync(id: any) {
        return this.http.get<any>(this.url + WarehouseApiUrls.getBinNameByIdAsync + id);
    }
}
