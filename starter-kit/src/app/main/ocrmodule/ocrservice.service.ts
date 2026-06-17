// ocrservice.service.ts — Google Vision support add பண்ணுங்க

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface OcrLine {
  item: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
}

export interface OcrParsed {
  invoiceNo?: string;
  invoiceDate?: string;
  total?: number;
  taxPercent?: number;
  taxAmount?: number;
  supplierName?: string;
  subTotal?: number;
  discount?: number;
  lines?: OcrLine[];
}

export interface OcrResponse {
  ocrId: number;
  text: string;
  meanConfidence: number;
  wordCount: number;
  pageRange?: string;
  parsed: OcrParsed;
  // ✅ NEW — which engine used
  engine?: 'tesseract' | 'vision' | 'groq';
}

@Injectable({ providedIn: 'root' })
export class OcrService {
  private base = environment.apiUrl + '/ocr';

  constructor(private http: HttpClient) {}

  // Tesseract — existing
  extractAny(
    file: File,
    opts: { lang?: string; module?: string; refNo?: string; createdBy?: string }
  ): Observable<OcrResponse> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('lang', opts.lang || 'eng');
    if (opts.module)    fd.append('module', opts.module);
    if (opts.refNo)     fd.append('refNo', opts.refNo);
    if (opts.createdBy) fd.append('createdBy', opts.createdBy);
    return this.http.post<OcrResponse>(`${this.base}/extract`, fd);
  }

  // Tesseract Multi — existing
  extractMulti(
    file: File,
    opts: { lang?: string; module?: string; createdBy?: string }
  ): Observable<OcrResponse[]> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('lang', opts.lang || 'eng');
    if (opts.module)    fd.append('module', opts.module);
    if (opts.createdBy) fd.append('createdBy', opts.createdBy);
    return this.http.post<OcrResponse[]>(`${this.base}/extract-multi`, fd);
  }

  // ✅ NEW — Google Vision Single
  extractVision(
    file: File,
    opts: { module?: string; createdBy?: string }
  ): Observable<OcrResponse> {
    const fd = new FormData();
    fd.append('file', file);
    if (opts.module)    fd.append('module', opts.module);
    if (opts.createdBy) fd.append('createdBy', opts.createdBy);
    return this.http.post<OcrResponse>(`${this.base}/extract-vision`, fd);
  }

  // ✅ NEW — Google Vision Multi
  extractVisionMulti(
    file: File,
    opts: { module?: string; createdBy?: string }
  ): Observable<OcrResponse[]> {
    const fd = new FormData();
    fd.append('file', file);
    if (opts.module)    fd.append('module', opts.module);
    if (opts.createdBy) fd.append('createdBy', opts.createdBy);
    return this.http.post<OcrResponse[]>(`${this.base}/extract-vision-multi`, fd);
  }
  extractGroqMulti(file: File, opts: { module?: string; createdBy?: string }): Observable<OcrResponse[]> {
  const fd = new FormData();
  fd.append('file', file);
  if (opts.module)    fd.append('module', opts.module);
  if (opts.createdBy) fd.append('createdBy', opts.createdBy);
  return this.http.post<OcrResponse[]>(`${this.base}/extract-groq-multi`, fd);
}
}
