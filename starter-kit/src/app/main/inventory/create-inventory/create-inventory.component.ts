import { Component, OnInit } from '@angular/core';

type Line = Record<string, any>;

@Component({
  selector: 'app-create-inventory',
  templateUrl: './create-inventory.component.html',
  styleUrls: ['./create-inventory.component.scss']
})
export class CreateInventoryComponent implements OnInit {

  constructor() { }
  ngOnInit(): void {}

  tabs = [
    'Item Master',
    'Stock Overview',
    'Stock Transfer',
    'Stock Take',
    'Stock Adjustment',
    'Cycle / Physical Count',
    'Reorder Planning',
    'Reports',
  ];
  tab = this.tabs[0];

  // ===== Item Master =====
  item = {
    sku: '',
    name: '',
    category: '',
    uom: '',
    barcode: '',
    costing: 'FIFO',
    min: 0,
    max: 0,
    reorder: 0,
    leadTime: 0,
    batchFlag: false,
    serialFlag: false,
    tax: 'NONE',
    specs: '',
    pics: [] as File[],
  };

  itemTabs = ['Summary', 'Pricing', 'Suppliers', 'BOM', 'Substitutes', 'Attachments', 'Audit'];
  itemSubTab = this.itemTabs[0];

  // ===== Stock Overview =====
  stockFilter = { warehouse: 'All', belowMin: false, expiring: false, search: '' };
  stockSample = [
    { item: 'Rice 5kg', warehouse: 'Central', bin: 'A1', onHand: 120, min: 50, exp: '2025-11-12' },
    { item: 'Oil 2L', warehouse: 'Central', bin: 'B3', onHand: 60, min: 20, exp: '2025-08-01' },
  ];

  // ===== Stock Transfer =====
  stHdr = { fromWh: 'Central', fromBin: 'A1', toWh: 'Branch', toBin: 'B1', reason: '' };
  stLines: Line[] = [];
  stColumns = [
    { key: 'item', header: 'Item' },
    { key: 'qty', header: 'Qty', type: 'number' },
    { key: 'batch', header: 'Batch/Serial' },
    { key: 'remarks', header: 'Remarks' },
  ];

  // Friendly getter/setter strings for single-field display without template casting
  get fromDisplay(): string {
    const wh = this.stHdr.fromWh ?? '';
    const bin = this.stHdr.fromBin ?? '';
    return [wh, bin].filter(Boolean).join(' / ');
  }
  onFromDisplayChange(v: string) {
    const parts = (v || '').split('/').map(s => s.trim());
    this.stHdr.fromWh = parts[0] ?? '';
    this.stHdr.fromBin = parts[1] ?? '';
  }
  get toDisplay(): string {
    const wh = this.stHdr.toWh ?? '';
    const bin = this.stHdr.toBin ?? '';
    return [wh, bin].filter(Boolean).join(' / ');
  }
  onToDisplayChange(v: string) {
    const parts = (v || '').split('/').map(s => s.trim());
    this.stHdr.toWh = parts[0] ?? '';
    this.stHdr.toBin = parts[1] ?? '';
  }

  // ===== Stock Take =====
  takePlan = { type: 'Cycle', strategy: 'ABC', freeze: false };
  takeLines: Line[] = [];
  takeColumns = [
    { key: 'loc', header: 'Location' },
    { key: 'item', header: 'Item' },
    { key: 'qty', header: 'Counted', type: 'number' },
    { key: 'barcode', header: 'Scan/Barcode' },
    { key: 'remarks', header: 'Remarks' },
  ];

  // ===== Stock Adjustment =====
  adjHdr = { type: 'Increase', reason: 'Damage', threshold: 0 };
  adjLines: Line[] = [];
  adjColumns = [
    { key: 'item', header: 'Item' },
    { key: 'qty', header: 'Qty', type: 'number' },
    { key: 'reason', header: 'Reason' },
    { key: 'remarks', header: 'Remarks' },
  ];

  // ===== Reorder Planning =====
  rpParams = { method: 'Min/Max', horizon: 30, includeLead: true };
  rpSample = [
    { item: 'Rice 5kg', onHand: 120, min: 50, reorder: 60, lead: 7, usage30: 40 },
    { item: 'Oil 2L', onHand: 60, min: 20, reorder: 30, lead: 3, usage30: 24 },
  ];

  // ===== Helpers (tables) =====
  trackByIdx = (_: number, __: unknown) => _;

  addLine(target: Line[]) {
    target.push({});
  }
  removeLine(target: Line[], idx: number) {
    target.splice(idx, 1);
  }
  changeLine(target: Line[], idx: number, key: string, value: any) {
    const row = { ...(target[idx] ?? {}) };
    row[key] = value;
    target[idx] = row;
  }

  // ===== Computed =====
  get stockRows() {
    const now30 = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    return this.stockSample.filter((r) =>
      (this.stockFilter.warehouse === 'All' || r.warehouse === this.stockFilter.warehouse) &&
      (!this.stockFilter.belowMin || r.onHand < r.min) &&
      (!this.stockFilter.expiring || new Date(r.exp) < now30) &&
      r.item.toLowerCase().includes(this.stockFilter.search.toLowerCase())
    );
  }

  get reorderSuggestions() {
    return this.rpSample.map((s) => ({
      ...s,
      suggest: Math.max(0, s.reorder - s.onHand),
    }));
  }

  // ===== UI events =====
  saveDemo(msg = 'Saved (demo)') {
    window.alert(msg);
  }

  // Badge tone helpers (avoid Tailwind purge issues by mapping)
  badgeToneClasses(tone: 'blue' | 'green' | 'amber' | 'red' = 'blue') {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      blue:  { bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-100'  },
      green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
      red:   { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-100'   },
    };
    const t = map[tone] ?? map.blue;
    return `${t.bg} ${t.text} ${t.border}`;
  }
}
