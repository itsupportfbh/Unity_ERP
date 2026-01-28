import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { BinAPIUrls } from 'Urls/BinApiUrls';

@Injectable({
  providedIn: 'root'
})
export class BinService {

 private url = environment.apiUrl;
  
    constructor(private http: HttpClient) {}
  
    getAllBin(): Observable<any> {
      return this.http.get<any[]>(this.url + BinAPIUrls.GetAllBin);
    }
  
    createBin(data: any): Observable<any> {
      return this.http.post(this.url + BinAPIUrls.CreateBin, data);
    }
  
    updateBin(id: number, data: any): Observable<any> {
      return this.http.put(`${this.url + BinAPIUrls.UpdateBin}${id}`, data);
    }
  
    deleteBin(id: number): Observable<any> {
      return this.http.delete(`${this.url + BinAPIUrls.DeleteBin}${id}`);
    }
  
    getByIdBin(id: number): Observable<any> {
      return this.http.get(`${this.url + BinAPIUrls.GetBinById}${id}`);
    }

     GetNameByBinAsync(name: any): Observable<any[]> {
            return this.http.get<any[]>(this.url + BinAPIUrls.GetNameByBinAsync + name);
        }
}
