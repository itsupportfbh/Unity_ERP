import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface OcrParsed {
  invoiceNo?: string;
  invoiceDate?: string;
  total?: number;
  taxPercent?: number;
  taxAmount?: number;
  supplierName?: string;
  subTotal?: number;
  discount?: number;
}

export interface OcrResponse {
  ocrId: number;
  text: string;
  meanConfidence: number;
  wordCount: number;
  parsed: OcrParsed;
}

@Injectable({ providedIn: 'root' })
export class OcrService {
  private base = environment.apiUrl + '/ocr'; // ✅ IMPORTANT

  constructor(private http: HttpClient) {}

  extractAny(file: File, opts: { lang?: string; module?: string; refNo?: string; createdBy?: string }): Observable<OcrResponse> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('lang', opts.lang || 'eng');
    if (opts.module) fd.append('module', opts.module);
    if (opts.refNo) fd.append('refNo', opts.refNo);
    if (opts.createdBy) fd.append('createdBy', opts.createdBy);
    return this.http.post<OcrResponse>(`${this.base}/extract`, fd); // ✅ POST
  }
}
