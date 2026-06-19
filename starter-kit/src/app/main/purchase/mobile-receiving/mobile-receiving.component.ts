import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MobileReceivingApi } from './mobile-receiving-service';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

type MobileScanRow = {
  ts: Date;
  barcode: string;
  qty: number;
  itemCode?: string;
  itemName?: string;
  status?: 'queued' | 'synced' | 'failed';
};

@Component({
  selector: 'app-mobile-receiving',
  templateUrl: './mobile-receiving.component.html',
  styleUrls: ['./mobile-receiving.component.scss']
})
export class MobileReceivingComponent implements OnInit, OnDestroy {
  @ViewChild('barcodeInput') barcodeInput?: ElementRef<HTMLInputElement>;
  @ViewChild('cameraVideo') cameraVideo?: ElementRef<HTMLVideoElement>;

  mrPo: string = '';
  mrBarcode: string = '';
  mrQty: number = 1;
  mrOffline: boolean = false;
  mrAutoAdd: boolean = true;
  mrScanMessage = '';
  mrScanMode: 'manual' | 'camera' = 'manual';
  isCameraOpen = false;
  isSyncing = false;
  cameraError = '';
  lastScanCode = '';
  lastScanAt = 0;

  mrRows: MobileScanRow[] = [];
  poLines: any[] = [];
  poIsOverseas = false;
  poIncotermsName = '';
  mrToken: string = '';
  private cameraStream: MediaStream | null = null;
  private codeReader: BrowserMultiFormatReader | null = null;
  private scanControls: any = null;

  constructor(private api: MobileReceivingApi, private route: ActivatedRoute, private ngZone: NgZone) {}

ngOnInit(): void {
  // load offline after po set (key needs po)
  this.route.queryParamMap.subscribe(params => {
    const poNo = params.get('poNo') || '';
    const token = params.get('t') || '';

    // if QR has token, store it
    if (token) {
      this.mrToken = token;
      sessionStorage.setItem('mrToken', token);
    }

    // allow if (logged in) OR (token present)
    const hasJwt = !!localStorage.getItem('token'); // adjust if your auth storage differs
    const hasToken = !!sessionStorage.getItem('mrToken');

    if (!hasJwt && !hasToken) {
      // no login + no token => deny
      window.location.href = '/pages/authentication/login-v2';
      return;
    }

    if (poNo) {
      this.mrPo = poNo;
      this.loadOffline();   // ✅ now key has poNo
      this.loadPo();
    }
  });
}

ngOnDestroy(): void {
  this.stopCamera();
}



  addScan(): void {
  if (!this.mrPo.trim() || !this.mrBarcode.trim()) {
    Swal.fire('Validation', 'Please enter both PO number and barcode', 'warning');
    return;
  }

  const poNo = this.mrPo.trim();
  const barcode = this.mrBarcode.trim();
  const qty = Number(this.mrQty || 0);

  if (!qty || qty <= 0) {
    Swal.fire('Validation', 'Please enter valid received qty.', 'warning');
    return;
  }

  const localError = this.validateLocalScan(barcode, qty);
  if (localError) {
    Swal.fire('Scan Failed', localError, 'warning');
    return;
  }

  // ✅ OFFLINE MODE: don't call API
  if (this.mrOffline) {
    this.addToLocalRows(barcode, qty);
    this.saveOffline();
    return;
  }

  // ✅ ONLINE MODE: validate with backend
  this.api.validateScan(poNo, barcode, qty).subscribe({
    next: () => {
      this.addToLocalRows(barcode, qty);
      this.saveOffline();
    },
    error: err => {
      if (err?.status === 0) {
        Swal.fire('Network Error', 'Network/API not reachable. Check Wi-Fi, API URL, CORS, or server.', 'error');
        return;
      }
      Swal.fire('Scan Failed', `Status: ${err.status}\n${err?.error?.message || err?.error || err.message || 'Scan failed'}`, 'error');
    }
  });
}

private addToLocalRows(barcode: string, qty: number) {
  const itemCode = this.itemCodeFrom(barcode);
  const line = this.findPoLine(itemCode);
  const found = this.mrRows.find(x => this.itemCodeFrom(x.barcode) === itemCode);
  if (found) found.qty += qty;
  else this.mrRows.unshift({
    ts: new Date(),
    barcode,
    qty,
    itemCode,
    itemName: line?.item || barcode,
    status: 'queued'
  });

  this.mrBarcode = '';
  this.mrQty = 1;
  this.mrScanMessage = `${itemCode} queued. Total queue: ${this.queueTotalQty}`;
  this.focusBarcode();
}

  syncMobile(): void {
    if (this.mrRows.length === 0) {
      Swal.fire('No Scans', 'No scans to sync.', 'warning');
      return;
    }

    const userId = Number(localStorage.getItem('id') || 0);
    const payload = this.mrRows.map(r => ({
      purchaseOrderNo: this.mrPo.trim(),
      itemKey: r.barcode,
      qty: r.qty,
      createdBy: userId
    }));

    this.isSyncing = true;
    this.api.sync({
  purchaseOrderNo: this.mrPo.trim(),
  lines: payload
}).subscribe({
      next: () => {
        this.isSyncing = false;
        Swal.fire('Synced', 'Sync completed. Desktop will now show received qty.', 'success');

        this.mrRows = [];
        localStorage.removeItem(this.offlineKey());
         this.loadPo(); 
      },
      error: err => {
        this.isSyncing = false;
        Swal.fire('Sync Failed', err?.error?.message || 'Sync failed', 'error');
      }
    });
  }

  toggleOffline(): void {
    this.mrOffline = !this.mrOffline;
    this.saveOffline();
  }

  private offlineKey(): string {
  return `mrRows_${this.mrPo?.trim() || 'NA'}`;
}

saveOffline(): void {
  localStorage.setItem(this.offlineKey(), JSON.stringify(this.mrRows));
}

loadOffline(): void {
  const saved = localStorage.getItem(this.offlineKey());
  const rows = saved ? JSON.parse(saved) : [];
  this.mrRows = (rows || []).map((r: any) => ({
    ...r,
    ts: r?.ts ? new Date(r.ts) : new Date(),
    qty: Number(r?.qty || 0),
    itemCode: r?.itemCode || this.itemCodeFrom(r?.barcode),
    status: r?.status || 'queued'
  }));
}

  trackByIndex(index: number): number {
    return index;
  }

  gridColsClass(cols: number): string {
    return `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${cols} gap-4`;
  }

  loadPo(): void {
  const poNo = this.mrPo?.trim();
  if (!poNo) return;

  this.api.getPo(poNo).subscribe({
    next: (res:any) => {
      this.poLines = res.lines || [];
      this.poIsOverseas = this.toBool(res.isOverseas ?? res.IsOverseas);
      this.poIncotermsName = res.incotermsName ?? res.IncotermsName ?? '';
      this.hydrateQueuedLineNames();
      this.focusBarcode();
    },
    error: err => {
      this.poLines = [];
      this.poIsOverseas = false;
      this.poIncotermsName = '';
      Swal.fire('Error', err?.error?.message || 'Failed to load PO', 'error');
    }
  });
}

private validateLocalScan(barcode: string, qty: number): string {
  const code = this.itemCodeFrom(barcode);
  if (!code) return 'Invalid barcode/item code.';

  if (!this.poLines?.length) return '';

  const line = this.poLines.find(l => this.itemCodeFrom(l?.item) === code);
  if (!line) return 'Scanned item is not available in this PO.';

  const alreadyQueued = (this.mrRows || [])
    .filter(r => this.itemCodeFrom(r.barcode) === code)
    .reduce((sum, r) => sum + Number(r.qty || 0), 0);

  const balance = Number(line.balanceQty || 0);
  if (alreadyQueued + qty > balance) {
    return `Over receiving not allowed. Balance qty is ${balance}, already queued ${alreadyQueued}.`;
  }

  return '';
}

removeScan(index: number): void {
  this.mrRows.splice(index, 1);
  this.saveOffline();
  this.focusBarcode();
}

clearQueue(): void {
  if (!this.mrRows.length) return;

  Swal.fire({
    title: 'Clear queued scans?',
    text: 'Unsynced mobile scans will be removed from this device.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Clear',
    confirmButtonColor: '#dc3545'
  }).then(result => {
    if (!result.isConfirmed) return;
    this.mrRows = [];
    this.saveOffline();
    this.focusBarcode();
  });
}

lineInputQty: { [item: string]: number } = {};

useLine(line: any): void {
  this.mrBarcode = this.itemCodeFrom(line?.item);
  this.mrQty = Math.max(1, Number(this.lineRemainingAfterQueue(line) || 1));
  this.focusBarcode();
}

addLineDirectly(line: any): void {
  const qty = Number(this.lineInputQty[line.item] || 1);
  if (qty <= 0) { Swal.fire('Validation', 'Enter a valid qty.', 'warning'); return; }
  this.mrBarcode = this.itemCodeFrom(line?.item);
  this.mrQty = qty;
  this.addScan();
  this.lineInputQty[line.item] = 1;
}

lineDefaultQty(line: any): number {
  return Math.max(1, this.lineRemainingAfterQueue(line));
}

lineQueuedQty(line: any): number {
  const code = this.itemCodeFrom(line?.item);
  return (this.mrRows || [])
    .filter(r => this.itemCodeFrom(r.barcode) === code)
    .reduce((sum, r) => sum + Number(r.qty || 0), 0);
}

lineRemainingAfterQueue(line: any): number {
  return Math.max(0, Number(line?.balanceQty || 0) - this.lineQueuedQty(line));
}

get queueTotalQty(): number {
  return +(this.mrRows || []).reduce((sum, r) => sum + Number(r.qty || 0), 0).toFixed(4);
}

get totalOrderedQty(): number {
  return +(this.poLines || []).reduce((sum, l) => sum + Number(l.qty || 0), 0).toFixed(4);
}

get totalReceivedQty(): number {
  return +(this.poLines || []).reduce((sum, l) => sum + Number(l.receivedQty || 0), 0).toFixed(4);
}

get totalBalanceQty(): number {
  return +(this.poLines || []).reduce((sum, l) => sum + Number(l.balanceQty || 0), 0).toFixed(4);
}

get totalRemainingAfterQueue(): number {
  return Math.max(0, +(this.totalBalanceQty - this.queueTotalQty).toFixed(4));
}

get receiveProgressPct(): number {
  if (!this.totalOrderedQty) return 0;
  return Math.min(100, +(((this.totalReceivedQty + this.queueTotalQty) / this.totalOrderedQty) * 100).toFixed(2));
}

async startCamera(): Promise<void> {
  this.cameraError = '';
  this.mrScanMode = 'camera';
  this.isCameraOpen = true;

  // Wait one tick for Angular to render the <video> element
  await new Promise(r => setTimeout(r, 50));

  const videoEl = this.cameraVideo?.nativeElement;
  if (!videoEl) {
    this.isCameraOpen = false;
    this.mrScanMode = 'manual';
    Swal.fire('Camera Error', 'Camera element not ready.', 'error');
    return;
  }

  const hints = new Map<DecodeHintType, any>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
  ]);

  this.codeReader = new BrowserMultiFormatReader(hints);

  try {
    // Get stream first so video shows immediately (avoids black screen)
    this.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    videoEl.srcObject = this.cameraStream;
    await videoEl.play();

    this.scanControls = await this.codeReader.decodeFromStream(
      this.cameraStream,
      videoEl,
      (result) => {
        if (!result) return;
        this.ngZone.run(() => {
          const raw = result.getText().trim();
          const now = Date.now();
          if (raw === this.lastScanCode && now - this.lastScanAt < 1500) return;
          this.lastScanCode = raw;
          this.lastScanAt = now;

          // Case 1: PO setup URL (e.g. http://host/mobilereceiving?poNo=PO-001&t=TOKEN)
          try {
            const url = new URL(raw);
            const poNo = url.searchParams.get('poNo');
            if (poNo) {
              const token = url.searchParams.get('t') || url.searchParams.get('T') || '';
              if (token) { this.mrToken = token; sessionStorage.setItem('mrToken', token); }
              if (this.mrPo !== poNo) { this.mrPo = poNo; this.loadPo(); }
              this.mrScanMessage = `PO loaded: ${poNo}`;
              return;
            }
          } catch { }

          // Case 2: Plain PO number (e.g. PO-00001)
          if (/^PO-\d+$/i.test(raw)) {
            if (this.mrPo !== raw.toUpperCase()) { this.mrPo = raw.toUpperCase(); this.loadPo(); }
            this.mrScanMessage = `PO loaded: ${raw.toUpperCase()}`;
            return;
          }

          // Case 3: Product barcode
          this.mrBarcode = raw;
          this.mrScanMessage = `Detected: ${this.itemCodeFrom(raw)}`;
          if (this.mrAutoAdd) this.addScan();
        });
      }
    );
  } catch (err: any) {
    this.cameraError = err?.message || 'Unable to open camera.';
    this.isCameraOpen = false;
    this.mrScanMode = 'manual';
    this.codeReader = null;
    Swal.fire('Camera Error', this.cameraError, 'error');
  }
}

stopCamera(): void {
  if (this.scanControls) {
    this.scanControls.stop();
    this.scanControls = null;
  }
  if (this.cameraStream) {
    this.cameraStream.getTracks().forEach(t => t.stop());
    this.cameraStream = null;
  }
  this.codeReader = null;
  this.isCameraOpen = false;
  this.mrScanMode = 'manual';
}

private hydrateQueuedLineNames(): void {
  this.mrRows = (this.mrRows || []).map(r => {
    const code = this.itemCodeFrom(r.barcode);
    const line = this.findPoLine(code);
    return {
      ...r,
      itemCode: code,
      itemName: r.itemName || line?.item || r.barcode
    };
  });
}

private findPoLine(code: string): any {
  return (this.poLines || []).find(l => this.itemCodeFrom(l?.item) === code);
}

private focusBarcode(): void {
  setTimeout(() => this.barcodeInput?.nativeElement?.focus(), 50);
}

private itemCodeFrom(value: any): string {
  let raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    raw =
      url.searchParams.get('itemKey') ||
      url.searchParams.get('item') ||
      url.searchParams.get('barcode') ||
      url.searchParams.get('code') ||
      raw;
  } catch {
    // Plain barcode or item code.
  }

  if (raw.includes('|')) {
    const parts = raw.split('|').map(x => x.trim()).filter(Boolean);
    raw = parts[parts.length - 1] || raw;
  }

  return raw.split(' - ')[0].trim().toUpperCase();
}

private toBool(value: any): boolean {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}
}
