import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { ItemApiUrls } from 'Urls/ItemsAPIUrls';

@Injectable({
  providedIn: 'root'
})
export class ItemsService {
 private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllItem(): Observable<any> {
    return this.http.get<any[]>(this.url + ItemApiUrls.GetAllItem);
  }

  createItem(data: any): Observable<any> {
    return this.http.post(this.url + ItemApiUrls.CreateItem, data);
  }

  updateItem(id: number, data: any): Observable<any> {
    return this.http.put(`${this.url + ItemApiUrls.UpdateItem}${id}`, data);
  }

  deleteItem(id: number): Observable<any> {
    return this.http.delete(`${this.url + ItemApiUrls.DeleteItem}${id}`);
  }

  getByIdItem(id: number): Observable<any> {
    return this.http.get(`${this.url + ItemApiUrls.GetItemById}${id}`);
  }

   checkItemExists(itemCode: string): Observable<any> {
    return this.http.get(`${this.url + ItemApiUrls.CheckItemExists}${itemCode}`);
  }
}
