import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SupplierInvoiceService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ======================
  // PIN CRUD
  // ======================
  getAll(): Observable<any> {
    return this.http.get(this.url + '/SupplierInvoicePin/GetAll');
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.url}/SupplierInvoicePin/GetById/${id}`);
  }

  create(payload: any): Observable<any> {
    return this.http.post(this.url + '/SupplierInvoicePin/Create', payload);
  }

  update(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.url}/SupplierInvoicePin/Update/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.url}/SupplierInvoicePin/Delete/${id}`);
  }

  // ======================
  // 3-way match
  // ======================
  getThreeWayMatch(pinId: number): Observable<any> {
    return this.http.get(`${this.url}/SupplierInvoicePin/GetThreeWayMatch/${pinId}`);
  }

  postToAp(pinId: number): Observable<any> {
    return this.http.post(`${this.url}/SupplierInvoicePin/PostToAp/${pinId}`, {});
  }

  // ======================
  // ✅ Debit Note: Missing methods (FIX)
  // ======================

  /** Debit Note create screen needs PO/GRN/PIN source details */
  getDebitNoteSource(pinId: number): Observable<any> {
    return this.http.get(`${this.url}/SupplierDebitNote/GetSourceByPin/${pinId}`);
  }

  /** After DN created -> mark PIN as DN created (or update status) */
  markDebitNote(pinId: number): Observable<any> {
    return this.http.post(`${this.url}/SupplierInvoicePin/MarkDebitNote/${pinId}`, {});
  }
}