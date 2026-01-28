// app/main/master/vehicle/vehicle.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { VehicleAPIUrls } from 'Urls/VehicleAPIUrls';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getVehicles(): Observable<any> {
    return this.http.get(this.base + VehicleAPIUrls.GetAll);
  }
  getVehicleById(id: number): Observable<any> {
    return this.http.get(this.base + VehicleAPIUrls.GetById + id);
  }
  createVehicle(data: any): Observable<any> {
    return this.http.post(this.base + VehicleAPIUrls.Create, data);
  }
  updateVehicle(id: number, data: any): Observable<any> {
    return this.http.put(this.base + VehicleAPIUrls.Update + id, data);
  }
  deleteVehicle(id: number): Observable<any> {
    return this.http.delete(this.base + VehicleAPIUrls.Delete + id);
  }
}
