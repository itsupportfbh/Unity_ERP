// ocruploadmodal.component.ts — Google Vision support add
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { OcrResponse, OcrService } from '../ocrservice.service';

@Component({
  selector: 'app-ocr-upload-modal',
  templateUrl: './ocruploadmodal.component.html',
  styleUrls: ['./ocruploadmodal.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class OcruploadmodalComponent {
  @Input() open = false;
  @Input() createdBy?: string;
  @Input() currencyId: number = 1;
  @Output() closed  = new EventEmitter<void>();
  @Output() applied = new EventEmitter<OcrResponse>();

  lang   = 'eng';
  // ✅ Engine selector — default Vision for scanned invoices
engine: 'tesseract' | 'vision' | 'groq' = 'groq';

  file?: File;
  previewUrl?: string;
  isImage   = true;
  totalPages = 0;

  loading  = false;
  error?: string;

  results: OcrResponse[] = [];
  selectedIdx = 0;

  progressPct  = 0;
  progressText = '';

  constructor(private ocr: OcrService) {}

  get activeResult(): OcrResponse | undefined {
    return this.results[this.selectedIdx];
  }

  get confidenceLevel(): 'low' | 'medium' | 'high' {
    const confidence = Number(this.activeResult?.meanConfidence || 0);
    if (confidence >= 0.80) return 'high';
    if (confidence >= 0.55) return 'medium';
    return 'low';
  }

  close() {
    this.open = false;
    this.reset();
    this.closed.emit();
  }

  onPick(e: any) {
    this.error      = undefined;
    this.results    = [];
    this.selectedIdx = 0;
    this.totalPages  = 0;

    const f = e?.target?.files?.[0] as File;
    this.file = f;
    this.previewUrl = undefined;

    if (!f) return;

    this.isImage = f.type?.startsWith('image/');

    if (this.isImage) {
      const reader = new FileReader();
      reader.onload = () => (this.previewUrl = String(reader.result || ''));
      reader.readAsDataURL(f);
    } else {
      this.previewUrl = '__pdf__';
    }
  }

run() {
  if (!this.file) return;

  this.loading      = true;
  this.error        = undefined;
  this.results      = [];
  this.selectedIdx  = 0;
  this.progressPct  = 10;
  this.progressText = this.engine === 'groq'
    ? 'Sending to Groq AI…'
    : this.engine === 'vision'
      ? 'Sending to Google Vision…'
      : 'Processing…';

  const opts = {
    lang:      this.lang,
    module:    'PIN',
    createdBy: this.createdBy
  };

  // ✅ Engine based on selection
  const api$ = this.engine === 'groq'
    ? this.ocr.extractGroqMulti(this.file, opts)
    : this.engine === 'vision'
      ? this.ocr.extractVisionMulti(this.file, opts)
      : this.ocr.extractMulti(this.file, opts);

  api$.subscribe({
    next: (res) => {
      this.results      = Array.isArray(res) ? res : [res];
      this.totalPages   = this.results.length;
      this.selectedIdx  = 0;
      this.loading      = false;
      this.progressPct  = 100;
      this.progressText = 'Done!';
    },
    error: (err) => {
      this.loading      = false;
      this.progressPct  = 0;
      this.progressText = '';
      this.error = err?.error?.message || err?.message || 'OCR failed';
    }
  });
}

  apply() {
    if (!this.activeResult) return;
    this.recalcTotals();
    this.applied.emit(this.activeResult);
    this.close();
  }

  addLine(): void {
    const result = this.activeResult;
    if (!result) return;

    result.parsed.lines = result.parsed.lines || [];
    result.parsed.lines.push({ item: '', qty: 1, unitPrice: 0, discountPct: 0 });
    this.recalcTotals();
  }

  removeLine(index: number): void {
    const lines = this.activeResult?.parsed?.lines;
    if (!lines) return;

    lines.splice(index, 1);
    this.recalcTotals();
  }

  recalcTotals(): void {
    const parsed = this.activeResult?.parsed;
    if (!parsed) return;

    const lines = parsed.lines || [];
    const lineTotal = lines.reduce((sum: number, line: any) => {
      const qty = Number(line.qty || 0);
      const unitPrice = Number(line.unitPrice || 0);
      return sum + qty * unitPrice;
    }, 0);

    if (lineTotal > 0) {
      parsed.subTotal = Number(lineTotal.toFixed(2));
    }

    const taxPercent = Number(parsed.taxPercent || 0);
    if (taxPercent > 0 && Number(parsed.subTotal || 0) > 0) {
      parsed.taxAmount = Number((Number(parsed.subTotal || 0) * taxPercent / 100).toFixed(2));
    }

    parsed.total = Number((Number(parsed.subTotal || 0) + Number(parsed.taxAmount || 0)).toFixed(2));
  }

  reset() {
    this.file         = undefined;
    this.previewUrl   = undefined;
    this.error        = undefined;
    this.results      = [];
    this.selectedIdx  = 0;
    this.totalPages   = 0;
    this.progressPct  = 0;
    this.progressText = '';
    this.loading      = false;
  }

  copy() {
    navigator.clipboard.writeText(this.activeResult?.text || '');
  }
}
