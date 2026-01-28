import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { GeneralLedgerApiUrls } from 'Urls/GeneralLedgerApiUrls';

@Injectable({
  providedIn: 'root'
})
export class GeneralLedgerService {

private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  GetGeneralLedger(): Observable<any> {
    return this.http.get<any[]>(this.url + GeneralLedgerApiUrls.GetGeneralLedger);
  }

}
