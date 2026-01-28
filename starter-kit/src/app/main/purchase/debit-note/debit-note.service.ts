// src/app/main/purchase/debit-note/debit-note.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { DebitNoteApiUrls } from 'Urls/DebitNoteApiUrls';

export interface DebitNoteLine {
  item?: string;
  qty?: number;
  price?: number;
  remarks?: string;
}

export interface DebitNoteDto {
  id?: number;
  supplierId: number;
  pinId?: number;
  grnId?: number;
  referenceNo?: string;
  reason?: string;
  noteDate: string;        // 'yyyy-MM-dd'
  amount: number;
  linesJson: string;
  status: number;          // 0 = Draft, 1 = Posted (or as you decide)
  createdBy?: string;
  updatedBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DebitNoteService {

  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // 🔹 GET all debit notes
  getAll(): Observable<any> {
    return this.http.get<any>(
      this.url + DebitNoteApiUrls.GetAllDebitNote
    );
  }

  // 🔹 GET single debit note by Id
  getById(id: number): Observable<any> {
    return this.http.get<any>(
      this.url + DebitNoteApiUrls.GetDebitNoteById + id
    );
  }

  // 🔹 CREATE debit note
  create(data: DebitNoteDto): Observable<any> {
    return this.http.post<any>(
      this.url + DebitNoteApiUrls.CreateDebitNote,
      data
    );
  }

  // 🔹 UPDATE debit note
  //   backend route: PUT SupplierDebitNote/Update/{id}
  update(id: number, data: DebitNoteDto): Observable<any> {
    return this.http.put<any>(
      this.url + DebitNoteApiUrls.UpdateDebitNote + id,
      data
    );
  }

  // 🔹 DELETE debit note
  delete(id: number): Observable<any> {
    return this.http.delete<any>(
      this.url + DebitNoteApiUrls.DeleteDebitNote + id
    );
  }

  // 🔹 NEW: Get source data for creating debit note (from PIN / GRN / PO)
  //   matches: [HttpGet("GetDebitNoteSource/{id}")]
  //   `id` is whatever you decided (usually PinId)
  getDebitNoteSource(id: number): Observable<any> {
    return this.http.get<any>(
      this.url + DebitNoteApiUrls.GetDebitNoteSource + id
    );
  }
}
