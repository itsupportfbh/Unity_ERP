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
  @Output() closed = new EventEmitter<void>();
  @Output() applied = new EventEmitter<OcrResponse>();

  lang = 'eng';
  file?: File;
  previewUrl?: string;
  isImage = true;

  loading = false;
  error?: string;
  result?: OcrResponse;

  constructor(private ocr: OcrService) {}

  close() {
    this.open = false;
    this.closed.emit();
  }

  onPick(e: any) {
    this.error = undefined;
    this.result = undefined;

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
      // PDF selected
      this.previewUrl = 'pdf';
    }
  }

  run() {
    if (!this.file) return;

    this.loading = true;
    this.error = undefined;
    this.result = undefined;

    this.ocr.extractAny(this.file, {
      lang: this.lang,
      module: 'PIN',
      createdBy: this.createdBy
    }).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'OCR failed';
      }
    });
  }

  apply() {
    if (!this.result) return;
    this.applied.emit(this.result);
    this.close();
  }

  reset() {
    this.file = undefined;
    this.previewUrl = undefined;
    this.error = undefined;
    this.result = undefined;
  }

  copy() {
    navigator.clipboard.writeText(this.result?.text || '');
  }
}
