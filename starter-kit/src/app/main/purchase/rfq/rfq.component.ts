import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { RfqService } from './rfq.service';

type RfqSupplier = {
  name: string;
  email?: string;
  phone?: string;
  invited: boolean;
  invitedAt?: Date;
};

type RfqItem = {
  item: string;
  qty: number;
  uom: string;
  remarks?: string;
};

type RfqWinnerLine = {
  itemIndex: number;
  item: string;
  qty: number;
  supplier: string;
  price: number;
  amount: number;
};

type RfqHistoryRecord = {
  id: number | string;
  rfqNo?: string;
  createdAt: string;
  validUntil: string;
  sendVia: 'Email' | 'WhatsApp' | 'Both';
  status: 'Draft' | 'Sent' | 'PO Drafted';
  suppliers: RfqSupplier[];
  items: RfqItem[];
  quotePrices: { [supplier: string]: { [itemIndex: number]: number } };
  winnerLines: RfqWinnerLine[];
  total: number;
};

@Component({
  selector: 'app-rfq',
  templateUrl: './rfq.component.html',
  styleUrls: ['./rfq.component.scss']
})
export class RfqComponent implements OnInit {

  rfqSuppliers: RfqSupplier[] = [];
  rfqSupplierText = '';
  rfqSupplierEmail = '';
  rfqSupplierPhone = '';

  rfqItems: RfqItem[] = [
    { item: '', qty: 1, uom: 'PCS', remarks: '' }
  ];

  validUntil = '';
  sendVia: 'Email' | 'WhatsApp' | 'Both' = 'Email';
  quotePrices: { [supplier: string]: { [itemIndex: number]: number } } = {};
  winnerLines: RfqWinnerLine[] = [];
  rfqHistory: RfqHistoryRecord[] = [];
  activeRfqId: number | string = '';

  constructor(private router: Router, private rfqService: RfqService) { }

  ngOnInit(): void {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    this.validUntil = d.toISOString().slice(0, 10);
    this.loadRfqHistory();
  }

  get invitedCount(): number {
    return this.rfqSuppliers.filter(s => s.invited).length;
  }

  get quotedSupplierCount(): number {
    return this.rfqSuppliers.filter(s =>
      Object.values(this.quotePrices[s.name] || {}).some(v => Number(v) > 0)
    ).length;
  }

  get winnerTotal(): number {
    return this.winnerLines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  }

  addRfqSupplier(): void {
    const name = this.rfqSupplierText.trim();
    if (!name) {
      Swal.fire('Validation', 'Enter supplier name.', 'warning');
      return;
    }
    if (this.rfqSuppliers.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      Swal.fire('Duplicate', 'Supplier already added.', 'info');
      return;
    }
    this.rfqSuppliers.push({
      name,
      email: this.rfqSupplierEmail.trim(),
      phone: this.rfqSupplierPhone.trim(),
      invited: false
    });
    this.quotePrices[name] = {};
    this.rfqSupplierText = '';
    this.rfqSupplierEmail = '';
    this.rfqSupplierPhone = '';
  }

  removeRfqSupplier(index: number): void {
    const removedSupplier = this.rfqSuppliers[index];
    this.rfqSuppliers.splice(index, 1);
    delete this.quotePrices[removedSupplier.name];
    this.calculateWinners(false);
  }

  addItem(): void {
    this.rfqItems = [...this.rfqItems, { item: '', qty: 1, uom: 'PCS', remarks: '' }];
  }

  removeItem(index: number): void {
    if (this.rfqItems.length === 1) {
      Swal.fire('Validation', 'At least one item is required.', 'warning');
      return;
    }
    this.rfqItems.splice(index, 1);
    Object.keys(this.quotePrices).forEach(supplier => {
      const next: { [itemIndex: number]: number } = {};
      Object.keys(this.quotePrices[supplier] || {}).forEach(key => {
        const oldIndex = Number(key);
        if (oldIndex < index) next[oldIndex] = this.quotePrices[supplier][oldIndex];
        if (oldIndex > index) next[oldIndex - 1] = this.quotePrices[supplier][oldIndex];
      });
      this.quotePrices[supplier] = next;
    });
    this.calculateWinners(false);
  }

  setQuotePrice(supplier: string, itemIndex: number, value: string): void {
    const price = Number(value);
    if (!this.quotePrices[supplier]) this.quotePrices[supplier] = {};
    this.quotePrices[supplier][itemIndex] = Number.isFinite(price) && price > 0 ? price : 0;
    this.calculateWinners(false);
  }

  sendRfq(): void {
    const validation = this.validateHeader();
    if (validation) {
      Swal.fire('Validation', validation, 'warning');
      return;
    }

    const contactValidation = this.validateSendContacts();
    if (contactValidation) {
      Swal.fire('Validation', contactValidation, 'warning');
      return;
    }

    this.rfqService.send(this.toRfqSendPayload()).subscribe({
      next: (response) => {
        const data = response?.data || response || {};
        const now = new Date();
        this.rfqSuppliers = this.rfqSuppliers.map(s => ({ ...s, invited: true, invitedAt: now }));
        this.saveRfq('Sent', false);
        Swal.fire(
          data.failedCount ? 'RFQ Send Processed' : 'RFQ Sent',
          `Sent: ${data.sentCount || 0}, Failed: ${data.failedCount || 0}`,
          data.failedCount ? 'warning' : 'success'
        );
      },
      error: () => {
        Swal.fire('Send Failed', 'Unable to send RFQ now. Check API/SMTP/WhatsApp settings.', 'error');
      }
    });
  }

  calculateWinners(showMessage = true): void {
    const winners: RfqWinnerLine[] = [];

    this.rfqItems.forEach((item, itemIndex) => {
      const quotes = this.rfqSuppliers
        .map(s => ({
          supplier: s.name,
          price: Number(this.quotePrices[s.name]?.[itemIndex] || 0)
        }))
        .filter(q => q.price > 0)
        .sort((a, b) => a.price - b.price);

      if (!quotes.length || !item.item?.trim() || Number(item.qty || 0) <= 0) return;

      const winner = quotes[0];
      const qty = Number(item.qty || 0);
      winners.push({
        itemIndex,
        item: item.item.trim(),
        qty,
        supplier: winner.supplier,
        price: winner.price,
        amount: Number((qty * winner.price).toFixed(2))
      });
    });

    this.winnerLines = winners;
    if (showMessage) {
      Swal.fire(
        winners.length ? 'Winner Calculated' : 'No Quotes',
        winners.length ? `${winners.length} item winner(s) selected by lowest price.` : 'Enter supplier quote prices first.',
        winners.length ? 'success' : 'warning'
      );
    }
  }

  createPoDraft(): void {
    const validation = this.validateHeader();
    if (validation) {
      Swal.fire('Validation', validation, 'warning');
      return;
    }

    this.calculateWinners(false);
    if (!this.winnerLines.length) {
      Swal.fire('Validation', 'Enter quote prices and calculate winners before creating PO.', 'warning');
      return;
    }

    const supplierCount = new Set(this.winnerLines.map(x => x.supplier)).size;
    if (supplierCount > 1) {
      Swal.fire('Multiple Suppliers', 'Winners belong to multiple suppliers. Create separate PO drafts per supplier.', 'warning');
      return;
    }

    const draft = {
      source: 'RFQ',
      supplierName: this.winnerLines[0].supplier,
      validUntil: this.validUntil,
      lines: this.winnerLines.map(line => ({
        itemName: line.item,
        qty: line.qty,
        price: line.price,
        amount: line.amount
      })),
      total: this.winnerTotal
    };

    sessionStorage.setItem('rfqPoDraft', JSON.stringify(draft));
    this.saveRfq('PO Drafted', false);
    Swal.fire('PO Draft Ready', 'Winner quote prepared as PO draft.', 'success')
      .then(() => this.router.navigate(['/purchase/create-purchaseorder'], { state: { rfqPoDraft: draft } }));
  }

  saveDraft(): void {
    const validation = this.validateHeader();
    if (validation) {
      Swal.fire('Validation', validation, 'warning');
      return;
    }

    this.saveRfq('Draft', true);
  }

  restoreRfq(record: RfqHistoryRecord): void {
    this.activeRfqId = record.id;
    this.validUntil = record.validUntil;
    this.sendVia = record.sendVia;
    this.rfqSuppliers = (record.suppliers || []).map(s => ({ ...s }));
    this.rfqItems = (record.items || []).map(x => ({ ...x }));
    this.quotePrices = JSON.parse(JSON.stringify(record.quotePrices || {}));
    this.winnerLines = (record.winnerLines || []).map(x => ({ ...x }));
    Swal.fire('RFQ Loaded', 'Saved RFQ restored for editing.', 'success');
  }

  deleteRfq(record: RfqHistoryRecord): void {
    const id = Number(record.id);
    if (!Number.isFinite(id) || id <= 0) {
      this.removeRfqFromHistory(record);
      return;
    }

    this.rfqService.delete(id).subscribe({
      next: () => this.removeRfqFromHistory(record),
      error: () => {
        this.removeRfqFromHistory(record);
        Swal.fire('Offline Delete', 'RFQ removed from local list. API delete failed.', 'info');
      }
    });
  }

  clearCurrent(): void {
    this.activeRfqId = '';
    this.rfqSuppliers = [];
    this.rfqSupplierText = '';
    this.rfqSupplierEmail = '';
    this.rfqSupplierPhone = '';
    this.rfqItems = [{ item: '', qty: 1, uom: 'PCS', remarks: '' }];
    this.quotePrices = {};
    this.winnerLines = [];
    const d = new Date();
    d.setDate(d.getDate() + 7);
    this.validUntil = d.toISOString().slice(0, 10);
  }

  getBestSupplier(itemIndex: number): string {
    const quotes = this.rfqSuppliers
      .map(s => ({ supplier: s.name, price: Number(this.quotePrices[s.name]?.[itemIndex] || 0) }))
      .filter(q => q.price > 0)
      .sort((a, b) => a.price - b.price);
    return quotes[0]?.supplier || '-';
  }

  getBestPrice(itemIndex: number): number | null {
    const prices = this.rfqSuppliers
      .map(s => Number(this.quotePrices[s.name]?.[itemIndex] || 0))
      .filter(v => v > 0)
      .sort((a, b) => a - b);
    return prices.length ? prices[0] : null;
  }

  isBestPrice(supplier: string, itemIndex: number): boolean {
    const price = Number(this.quotePrices[supplier]?.[itemIndex] || 0);
    const best = this.getBestPrice(itemIndex);
    return !!best && price === best;
  }

  private validateHeader(): string | null {
    if (!this.validUntil) return 'Select RFQ valid until date.';
    if (!this.rfqSuppliers.length) return 'Add at least one supplier.';
    const validItems = this.rfqItems.filter(x => x.item?.trim() && Number(x.qty || 0) > 0);
    if (!validItems.length) return 'Add at least one item with quantity.';
    return null;
  }

  private validateSendContacts(): string | null {
    const needsEmail = this.sendVia === 'Email' || this.sendVia === 'Both';
    const needsPhone = this.sendVia === 'WhatsApp' || this.sendVia === 'Both';
    const missingEmail = needsEmail ? this.rfqSuppliers.filter(x => !x.email?.trim()).map(x => x.name) : [];
    const missingPhone = needsPhone ? this.rfqSuppliers.filter(x => !x.phone?.trim()).map(x => x.name) : [];

    if (missingEmail.length) return `Email missing for: ${missingEmail.join(', ')}`;
    if (missingPhone.length) return `WhatsApp phone missing for: ${missingPhone.join(', ')}`;
    return null;
  }

  private saveRfq(status: RfqHistoryRecord['status'], showMessage: boolean): void {
    const now = new Date().toISOString();
    const id = this.activeRfqId || `RFQ-${Date.now()}`;
    const record: RfqHistoryRecord = {
      id,
      createdAt: now,
      validUntil: this.validUntil,
      sendVia: this.sendVia,
      status,
      suppliers: this.rfqSuppliers.map(s => ({ ...s })),
      items: this.rfqItems.map(x => ({ ...x })),
      quotePrices: JSON.parse(JSON.stringify(this.quotePrices || {})),
      winnerLines: this.winnerLines.map(x => ({ ...x })),
      total: this.winnerTotal
    };

    const payload = this.toRfqPayload(record, status);
    const activeId = Number(this.activeRfqId);
    const request = Number.isFinite(activeId) && activeId > 0
      ? this.rfqService.update(activeId, payload)
      : this.rfqService.create(payload);

    request.subscribe({
      next: (response) => {
        const responseData = response?.data || response || payload;
        const saved = typeof responseData === 'number'
          ? { ...record, id: responseData }
          : this.fromApiRfq(responseData, record);
        this.activeRfqId = saved.id;
        this.upsertRfqHistory(saved);
        if (showMessage) {
          Swal.fire('Saved', 'RFQ saved in backend.', 'success');
        }
      },
      error: () => {
        this.activeRfqId = id;
        this.upsertRfqHistory(record);
        if (showMessage) {
          Swal.fire('Saved Offline', 'RFQ saved in local history. API not reachable.', 'info');
        }
      }
    });
  }

  private upsertRfqHistory(record: RfqHistoryRecord): void {
    this.rfqHistory = [record, ...this.rfqHistory.filter(x => x.id !== record.id)].slice(0, 25);
    this.persistRfqHistory();
  }

  private removeRfqFromHistory(record: RfqHistoryRecord): void {
    this.rfqHistory = this.rfqHistory.filter(x => x.id !== record.id);
    if (this.activeRfqId === record.id) this.activeRfqId = '';
    this.persistRfqHistory();
  }

  private loadRfqHistory(): void {
    this.rfqService.getAll().subscribe({
      next: (response) => {
        const rows = response?.data || response || [];
        this.rfqHistory = Array.isArray(rows) ? rows.map((x: any) => this.fromApiRfq(x)) : [];
        this.persistRfqHistory();
      },
      error: () => this.loadLocalRfqHistory()
    });
  }

  private loadLocalRfqHistory(): void {
    try {
      const raw = localStorage.getItem('purchaseRfqHistory');
      this.rfqHistory = raw ? JSON.parse(raw) : [];
    } catch {
      this.rfqHistory = [];
    }
  }

  private toRfqPayload(record: RfqHistoryRecord, status: RfqHistoryRecord['status']): any {
    return {
      id: Number(record.id) || 0,
      rfqNo: record.rfqNo || '',
      createdAt: record.createdAt,
      validUntil: record.validUntil,
      sendVia: record.sendVia,
      status,
      suppliersJson: JSON.stringify(record.suppliers || []),
      itemsJson: JSON.stringify(record.items || []),
      quotePricesJson: JSON.stringify(record.quotePrices || {}),
      winnerLinesJson: JSON.stringify(record.winnerLines || []),
      total: Number(record.total || 0)
    };
  }

  private toRfqSendPayload(): any {
    return {
      rfqNo: this.activeRfqId ? String(this.activeRfqId) : '',
      validUntil: this.validUntil,
      sendVia: this.sendVia,
      itemsJson: JSON.stringify(this.rfqItems || []),
      suppliers: this.rfqSuppliers.map(s => ({
        name: s.name,
        email: s.email || '',
        phone: s.phone || ''
      }))
    };
  }

  private fromApiRfq(api: any, fallback?: RfqHistoryRecord): RfqHistoryRecord {
    return {
      id: api?.id || fallback?.id || `RFQ-${Date.now()}`,
      rfqNo: api?.rfqNo || fallback?.rfqNo || '',
      createdAt: api?.createdAt || fallback?.createdAt || new Date().toISOString(),
      validUntil: (api?.validUntil || fallback?.validUntil || '').toString().slice(0, 10),
      sendVia: api?.sendVia || fallback?.sendVia || 'Email',
      status: api?.status || fallback?.status || 'Draft',
      suppliers: this.parseJson(api?.suppliersJson, fallback?.suppliers || []),
      items: this.parseJson(api?.itemsJson, fallback?.items || []),
      quotePrices: this.parseJson(api?.quotePricesJson, fallback?.quotePrices || {}),
      winnerLines: this.parseJson(api?.winnerLinesJson, fallback?.winnerLines || []),
      total: Number(api?.total ?? fallback?.total ?? 0)
    };
  }

  private parseJson<T>(value: string, fallback: T): T {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  private persistRfqHistory(): void {
    localStorage.setItem('purchaseRfqHistory', JSON.stringify(this.rfqHistory || []));
  }

  trackByIndex(index: number): number {
    return index;
  }
}
