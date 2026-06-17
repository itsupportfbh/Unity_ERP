import { Component, OnInit } from '@angular/core';
import { WhatsAppMessageLog, WhatsAppTimelineService } from './whatsapp-timeline.service';

@Component({
  selector: 'app-whatsapp-timeline',
  templateUrl: './whatsapp-timeline.component.html',
  styleUrls: ['./whatsapp-timeline.component.scss']
})
export class WhatsAppTimelineComponent implements OnInit {
  documentType = '';
  documentId = '';
  phone = '';
  fromDate = '';
  toDate = '';
  loading = false;
  error = '';
  rows: WhatsAppMessageLog[] = [];
  selected: WhatsAppMessageLog | null = null;

  documentTypes = ['', 'SalesInvoice', 'Quotation', 'RFQ', 'PurchaseOrder'];

  constructor(private service: WhatsAppTimelineService) {}

  ngOnInit(): void {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 29);
    this.fromDate = this.toInputDate(from);
    this.toDate = this.toInputDate(today);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.getLogs({
      documentType: this.documentType,
      documentId: this.documentId,
      phone: this.phone,
      fromDate: this.fromDate,
      toDate: this.toDate,
      take: 150
    }).subscribe({
      next: rows => {
        this.rows = rows || [];
        this.selected = this.rows[0] || null;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.message || err?.message || 'Unable to load WhatsApp timeline.';
        this.loading = false;
      }
    });
  }

  select(row: WhatsAppMessageLog): void {
    this.selected = row;
  }

  dateTime(value: string): string {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  }

  statusClass(row: WhatsAppMessageLog): string {
    const status = (row.status || '').toLowerCase();
    if (status === 'sent') return 'sent';
    if (status === 'queued') return 'queued';
    if (status === 'failed') return 'failed';
    return 'normal';
  }

  prettyResponse(value?: string): string {
    if (!value) return '-';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  private toInputDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
