import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MobileReceivingApi } from './mobile-receiving-service';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

declare const BarcodeDetector: any;

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
  private scanTimer: any = null;

  constructor(private api: MobileReceivingApi,private route: ActivatedRoute) {}

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

useLine(line: any): void {
  this.mrBarcode = this.itemCodeFrom(line?.item);
  this.mrQty = Math.max(1, Number(this.lineRemainingAfterQueue(line) || 1));
  this.focusBarcode();
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

  if (typeof BarcodeDetector === 'undefined') {
    this.cameraError = 'Camera barcode detection is not supported in this browser. Use hardware scanner/manual scan.';
    Swal.fire('Camera Not Supported', this.cameraError, 'info');
    return;
  }

  try {
    this.mrScanMode = 'camera';
    this.isCameraOpen = true;
    this.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });

    setTimeout(() => {
      if (this.cameraVideo?.nativeElement && this.cameraStream) {
        this.cameraVideo.nativeElement.srcObject = this.cameraStream;
        this.cameraVideo.nativeElement.play();
        this.scanTimer = setInterval(() => this.decodeFrame(), 700);
      }
    }, 0);
  } catch (err: any) {
    this.cameraError = err?.message || 'Unable to open camera.';
    this.isCameraOpen = false;
    Swal.fire('Camera Error', this.cameraError, 'error');
  }
}

stopCamera(): void {
  if (this.scanTimer) {
    clearInterval(this.scanTimer);
    this.scanTimer = null;
  }

  if (this.cameraStream) {
    this.cameraStream.getTracks().forEach(t => t.stop());
    this.cameraStream = null;
  }

  this.isCameraOpen = false;
  this.mrScanMode = 'manual';
}

private async decodeFrame(): Promise<void> {
  if (!this.cameraVideo?.nativeElement || typeof BarcodeDetector === 'undefined') return;

  try {
    const detector = new BarcodeDetector({
      formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
    });
    const codes = await detector.detect(this.cameraVideo.nativeElement);
    const raw = codes?.[0]?.rawValue || '';
    if (!raw) return;

    const now = Date.now();
    if (raw === this.lastScanCode && now - this.lastScanAt < 1500) return;
    this.lastScanCode = raw;
    this.lastScanAt = now;
    this.mrBarcode = raw;
    this.mrScanMessage = `Detected ${this.itemCodeFrom(raw)}`;
    if (this.mrAutoAdd) this.addScan();
  } catch {
    // keep camera running; detector can fail on blurry frames
  }
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
  return String(value || '').trim().split(' - ')[0].trim().toUpperCase();
}

private toBool(value: any): boolean {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}
}
