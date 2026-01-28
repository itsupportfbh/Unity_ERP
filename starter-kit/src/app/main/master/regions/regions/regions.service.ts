import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { RegionsApiUrls } from 'Urls/RegionsAPIUrls';


@Injectable({
    providedIn: 'root'
})
export class RegionService {
    private url = environment.apiUrl
    private requestSource = new BehaviorSubject<any>(null);
    currentRequest = this.requestSource.asObservable();
    constructor(private http: HttpClient) { }

    getRegion(): Observable<any[]> {
        return this.http.get<any[]>(this.url + RegionsApiUrls.GetAllRegions);
    }

    getRegionById(id: any): Observable<any[]> {
        return this.http.get<any[]>(this.url + RegionsApiUrls.GetRegionsById + id);
    }

    insertRegion(data: any): Observable<any> {
        return this.http.post<any>(this.url + RegionsApiUrls.CreateRegion, data);
    }

    updateRegion(data: any): Observable<any> {
        return this.http.put<any>(this.url + RegionsApiUrls.UpdateRegion, data);
    }

    deleteRegion(id: any) {
        return this.http.delete<any>(this.url + RegionsApiUrls.DeleteRegion + id);
    }

}
