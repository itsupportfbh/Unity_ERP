import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { DeductionsApiUrls } from 'Urls/DeductionsAPIUrl';



@Injectable({
    providedIn: 'root'
})
export class DeductionService {
    private url = environment.apiUrl
    private requestSource = new BehaviorSubject<any>(null);
    currentRequest = this.requestSource.asObservable();
    constructor(private http: HttpClient) { }

    getDeduction(): Observable<any[]> {
        return this.http.get<any[]>(this.url + DeductionsApiUrls.GetAllDeduction);
    }

    getDeductionById(id: any): Observable<any[]> {
        return this.http.get<any[]>(this.url + DeductionsApiUrls.GetDeductionById + id);
    }

    insertDeduction(data: any): Observable<any> {
        return this.http.post<any>(this.url + DeductionsApiUrls.CreateDeduction, data);
    }

    updateDeduction(data: any): Observable<any> {
        return this.http.put<any>(this.url + DeductionsApiUrls.UpdateDeduction, data);
    }

    deleteDeduction(id: any) {
        return this.http.delete<any>(this.url + DeductionsApiUrls.DeleteDeduction + id);
    }

}
