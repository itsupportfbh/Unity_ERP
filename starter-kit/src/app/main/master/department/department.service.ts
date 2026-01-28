import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { DepartmentApiUrls } from 'Urls/DepartmentAPIUrl';



@Injectable({
    providedIn: 'root'
})
export class DepartmentService {
    private url = environment.apiUrl
    private requestSource = new BehaviorSubject<any>(null);
    currentRequest = this.requestSource.asObservable();
    constructor(private http: HttpClient) { }

    getDepartment(): Observable<any[]> {
        return this.http.get<any[]>(this.url + DepartmentApiUrls.GetAllDepartment);
    }

    getDepartmentById(id: any): Observable<any[]> {
        return this.http.get<any[]>(this.url + DepartmentApiUrls.GetDepartmentById + id);
    }

    insertDepartment(data: any): Observable<any> {
        return this.http.post<any>(this.url + DepartmentApiUrls.CreateDepartment, data);
    }

    updateDepartment(data: any): Observable<any> {
        return this.http.put<any>(this.url + DepartmentApiUrls.UpdateDepartment, data);
    }

    deleteDepartment(id: any) {
        return this.http.delete<any>(this.url + DepartmentApiUrls.DeleteDepartment + id);
    }

}
