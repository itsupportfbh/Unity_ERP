import { Component, OnInit } from '@angular/core';
import { MobileReceivingApi } from './mobile-receiving-service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-mobile-receiving',
  templateUrl: './mobile-receiving.component.html',
  styleUrls: ['./mobile-receiving.component.scss']
})
export class MobileReceivingComponent implements OnInit {

  mrPo: string = '';
  mrBarcode: string = '';
  mrOffline: boolean = false;

  mrRows: Array<{
    ts: Date;
    barcode: string;
    qty: number;
  }> = [];
  poLines: any[] = [];
  mrToken: string = '';

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



  addScan(): void {
  if (!this.mrPo.trim() || !this.mrBarcode.trim()) {
    alert('Please enter both PO number and barcode');
    return;
  }

  const poNo = this.mrPo.trim();
  const barcode = this.mrBarcode.trim();

  // ✅ OFFLINE MODE: don't call API
  if (this.mrOffline) {
    this.addToLocalRows(barcode);
    this.saveOffline();
    return;
  }

  // ✅ ONLINE MODE: validate with backend
  this.api.validateScan(poNo, barcode).subscribe({
    next: () => {
      this.addToLocalRows(barcode);
    },
    error: err => {
      if (err?.status === 0) {
        alert('Network/API not reachable (Status 0). Check Wi-Fi / API URL / CORS / server.');
        return;
      }
      alert(`Status: ${err.status}\n${err?.error?.message || err?.error || err.message || 'Scan failed'}`);
    }
  });
}

private addToLocalRows(barcode: string) {
  const found = this.mrRows.find(x => x.barcode === barcode);
  if (found) found.qty += 1;
  else this.mrRows.unshift({ ts: new Date(), barcode, qty: 1 });

  this.mrBarcode = '';
}

  syncMobile(): void {
    if (this.mrRows.length === 0) {
      alert('No scans to sync.');
      return;
    }

    const payload = this.mrRows.map(r => ({
      purchaseOrderNo: this.mrPo.trim(),
      itemKey: r.barcode,
      qty: r.qty,
      createdBy: 'mobile'
    }));

    this.api.sync({
  purchaseOrderNo: this.mrPo.trim(),
  lines: payload
}).subscribe({
      next: () => {
        alert('Sync completed. Desktop will now show received qty.');

        this.mrRows = [];
        localStorage.removeItem(this.offlineKey());
         this.loadPo(); 
      },
      error: err => {
        alert(err?.error?.message || 'Sync failed');
      }
    });
  }

  toggleOffline(): void {
    this.mrOffline = !this.mrOffline;
  }

  private offlineKey(): string {
  return `mrRows_${this.mrPo?.trim() || 'NA'}`;
}

saveOffline(): void {
  localStorage.setItem(this.offlineKey(), JSON.stringify(this.mrRows));
}

loadOffline(): void {
  const saved = localStorage.getItem(this.offlineKey());
  this.mrRows = saved ? JSON.parse(saved) : [];
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
    },
    error: err => alert(err?.error?.message || 'Failed to load PO')
  });
}
}
