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
    this.applied.emit(this.activeResult);
    this.close();
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