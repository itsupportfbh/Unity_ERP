import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { DepartmentApiUrls } from 'Urls/DepartmentAPIUrl';
import { IncomeApiUrls } from 'Urls/IncomeAPIUrl';



@Injectable({
    providedIn: 'root'
})
export class IncomeService {
    private url = environment.apiUrl
    private requestSource = new BehaviorSubject<any>(null);
    currentRequest = this.requestSource.asObservable();
    constructor(private http: HttpClient) { }

    getIncome(): Observable<any[]> {
        return this.http.get<any[]>(this.url + IncomeApiUrls.GetAllIncome);
    }

    getIncomeById(id: any): Observable<any[]> {
        return this.http.get<any[]>(this.url + IncomeApiUrls.GetIncomeById + id);
    }

    insertIncome(data: any): Observable<any> {
        return this.http.post<any>(this.url + IncomeApiUrls.CreateIncome, data);
    }

    updateIncome(data: any): Observable<any> {
        return this.http.put<any>(this.url + IncomeApiUrls.UpdateIncome, data);
    }

    deleteIncome(id: any) {
        return this.http.delete<any>(this.url + IncomeApiUrls.DeleteIncome + id);
    }

}
