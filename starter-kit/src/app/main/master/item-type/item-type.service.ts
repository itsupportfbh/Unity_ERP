import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { ItemTypeAPIUrls } from 'Urls/ItemtypeApiUrls';

@Injectable({
  providedIn: 'root'
})
export class ItemTypeService {


 private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllItemType(): Observable<any> {
    return this.http.get<any[]>(this.url + ItemTypeAPIUrls.GetAllItemType);
  }

  createItemType(data: any): Observable<any> {
    return this.http.post(this.url + ItemTypeAPIUrls.CreateItemType, data);
  }

  updateItemType(id: number, data: any): Observable<any> {
    return this.http.put(`${this.url + ItemTypeAPIUrls.UpdateItemType}${id}`, data);
  }

  deleteItemType(id: number): Observable<any> {
    return this.http.delete(`${this.url + ItemTypeAPIUrls.DeleteItemType}${id}`);
  }

  getByIdItemType(id: number): Observable<any> {
    return this.http.get(`${this.url + ItemTypeAPIUrls.GetItemTypeById}${id}`);
  }


}
