import {
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  AfterViewInit,
  AfterViewChecked
} from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ColumnMode, DatatableComponent } from '@swimlane/ngx-datatable';
import { DatePipe } from '@angular/common';
import * as feather from 'feather-icons';

import { POService } from '../purchase-order.service';
import { POTempService } from '../purchase-order-temp.service';
import { PurchaseService } from '../../purchase.service';
import { forkJoin } from 'rxjs';
import { PeriodCloseService } from 'app/main/financial/period-close-fx/period-close-fx.service';
export interface PeriodStatusDto {
  isLocked: boolean;
  periodName?: string;
  periodCode?: string;
  startDate?: string;
  endDate?: string;
}
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type PoLinePrintRow = {
  description: string;
  taxCode?: string;
  qty: number;
  uom: string;
  unitPrice: number;
  discountPct?: number;
  taxAmt?: number;
  amount: number;
};

type PurchaseOrderPrintDTO = {
  purchaseOrderNo: string;
  poDate: any;
  deliveryDate: any;
  currency: string;
  terms?: string;

  orderTo?: string;
  billTo?: string;
  deliverTo?: string;
  remarks?: string;

  lines: Array<PoLinePrintRow>;

  subTotal: number;

  discountLines: number;
  discountAbsolute: number;
  taxLines: number;
  shippingCost: number;
  taxPct: number;
  taxPctAmt: number;
  netTotal: number;
};



// this matches what you showed
export interface PeriodStatusResponseRaw {
  isSuccess?: boolean;
  isLocked?: boolean;
  periodName?: string;
  startDate?: string;
  endDate?: string;
  // in case backend later wraps in data
  data?: PeriodStatusDto | null;
}
@Component({
  selector: 'app-purchase-orde-list',
  templateUrl: './purchase-orde-list.component.html',
  styleUrls: ['./purchase-orde-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [DatePipe]
})
export class PurchaseOrdeListComponent
  implements OnInit, AfterViewInit, AfterViewChecked {

  @ViewChild(DatatableComponent) table!: DatatableComponent;

  rows: any[] = [];
  tempData: any[] = [];

  public searchValue = '';
  public ColumnMode = ColumnMode;
  public selectedOption = 10;

  // PO lines modal
  showLinesModal = false;
  modalLines: any[] = [];
  modalTotal: number = 0;

  // Drafts
  showDraftsModal = false;
  drafts: any[] = [];

  // Reorder modal
  showReorderModal = false;
  reorderAll: any[] = [];   // master list (reorder PRs)
  reorderRows: any[] = [];  // filtered list
  reorderSearch = '';
  reorderCount = 0;         // available reorder PRs (not used in any PO)
isPeriodLocked = false;
  currentPeriodName = '';
  // QR modal
showQrModal = false;
qrPoNo = '';
qrPayloadUrl = '';
qrImgBase64 = '';
reorderAlertCount
showPendingPrModal = false;
pendingPrList: any[] = [];
pendingPrCount = 0;
pendingPrSearch = '';
  modalLocation: any;

 showEmailConfirmModal = false;
emailConfirmRow: any = null;
emailSending = false;


  // Print details 
      // ✅ PO PDF modal
    showPoPdfModal = false;
    poPdfLoading = false;

    poPdfMeta: any = null;

    poPdfBlob: Blob | null = null;
    poPdfObjectUrl: string | null = null;
    poPdfSafeUrl: SafeResourceUrl | null = null;

    // pdfmake cache
    private _pdfMake: any = null;
    private _pdfReady = false;

    // company info (match your real company)
    private companyInfo = {
      name: 'Catering Solutions Pte Ltd',
      address1: '96, Tuas South Boulevard #01-41',
      address2: 'Singapore-637051',
      phone: 'Tel : 63699660',
      fax: 'Fax : 63699271',
      gst: 'GST No: 201315114E'
    };

    private _logoDataUrl: string | null = null;


  constructor(
    private poService: POService,
    private router: Router,
    private datePipe: DatePipe,
    private poTempService: POTempService,
    private purchaseService: PurchaseService,
    private periodService: PeriodCloseService,
     private sanitizer: DomSanitizer
  ) {}

  // ================== Lifecycle ==================

  ngOnInit(): void {
     const today = new Date().toISOString().substring(0, 10);
    this.checkPeriodLockForDate(today);
    this.loadRequests();
    this.loadDrafts();
    this.loadReorderCount();
    this.loadPendingPrCount();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  // ================== Helpers ==================

  get displayReorderCount() {
    return this.reorderCount > 99 ? '99+' : this.reorderCount;
  }

  private checkPeriodLockForDate(dateStr: string): void {
    if (!dateStr) { return; }

    this.periodService.getStatusForDateWithName(dateStr).subscribe({
      next: (res: PeriodStatusDto | null) => {
        this.isPeriodLocked = !!res?.isLocked;
        this.currentPeriodName = res?.periodName || '';
      },
      error: () => {
        // if fails, UI side don’t hard-lock; backend will still protect
        this.isPeriodLocked = false;
        this.currentPeriodName = '';
      }
    });
  }

  private lockBodyScroll() {
  document.body.classList.add('modal-open-no-scroll');
  }
  private unlockBodyScroll() {
    document.body.classList.remove('modal-open-no-scroll');
  }

  private clearPoPdfPreview() {
    if (this.poPdfObjectUrl) {
      URL.revokeObjectURL(this.poPdfObjectUrl);
      this.poPdfObjectUrl = null;
    }
    this.poPdfSafeUrl = null;
    this.poPdfBlob = null;
  }

  // ================== List / Search ==================

  loadRequests(): void {
    this.poService.getPO().subscribe({
      next: (res: any) => {
        const data = res?.data || [];
        this.rows = data.map((req: any) => ({ ...req }));
        this.tempData = [...this.rows];
        if (this.table) this.table.offset = 0;
      },
      error: (err: any) => console.error('Error loading list', err)
    });
  }

  filterUpdate(event: any): void {
    const val = (event?.target?.value || '').toString().toLowerCase();

    if (!val) {
      this.rows = [...this.tempData];
      if (this.table) this.table.offset = 0;
      return;
    }

    const temp = this.tempData.filter((d: any) => {
      const poNo = (d.purchaseOrderNo || '').toString().toLowerCase();
      const supplierName = (d.supplierName || '').toString().toLowerCase();
      const currencyName = (d.currencyName || '').toString().toLowerCase();
      const approvalStatusStr = (d.approvalStatus || '').toString().toLowerCase();
      const poDate = this.datePipe.transform(d.poDate, 'dd-MM-yyyy')?.toLowerCase() || '';
      const deliveryDate = this.datePipe.transform(d.deliveryDate, 'dd-MM-yyyy')?.toLowerCase() || '';

      return (
        poNo.includes(val) ||
        supplierName.includes(val) ||
        currencyName.includes(val) ||
        approvalStatusStr.includes(val) ||
        poDate.includes(val) ||
        deliveryDate.includes(val)
      );
    });

    this.rows = temp;
    if (this.table) this.table.offset = 0;
  }

  // ================== Navigation / Actions ==================

  openCreate(): void {
      if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('create Purchase Requests');
      return;
    }
    this.router.navigate(['/purchase/create-purchaseorder']);
  }

  editPO(row: any): void {
     if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('edit Purchase Requests');
      return;
    }
    this.router.navigateByUrl(`/purchase/edit-purchaseorder/${row.id}`);
  }

  deletePO(id: number): void {
     if (this.isPeriodLocked) {
      this.showPeriodLockedSwal('delete Purchase Requests');
      return;
    }
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the PO.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.poService.deletePO(id).subscribe({
          next: () => {
            this.loadRequests();
            Swal.fire('Deleted!', 'PO has been deleted.', 'success');
          },
          error: (err) => console.error('Error deleting request', err)
        });
      }
    });
  }
private showPeriodLockedSwal(action: string): void {
    Swal.fire(
      'Period Locked',
      this.currentPeriodName
        ? `Period "${this.currentPeriodName}" is locked. You cannot ${action} in this period.`
        : `Selected accounting period is locked. You cannot ${action}.`,
      'warning'
    );
  }
  // Lock edit/delete if approved/rejected
  isRowLocked(row: any): boolean {
    const v = row?.approvalStatus ?? row?.ApprovalStatus ?? row?.status;
    if (v == null) return false;

    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      return s === 'approved' || s === 'rejected';
    }

    const code = Number(v);
    // adjust if your numeric codes differ
    // e.g. 1=Pending, 2=Approved, 3=Rejected
    return [2, 3].includes(code);
  }

  // ================== PO Lines Modal ==================

  openLinesModal(row: any): void {
  let linesRaw: any[] = [];
  try {
    linesRaw = Array.isArray(row?.poLines)
      ? row.poLines
      : JSON.parse(row?.poLines || '[]');
  } catch {
    linesRaw = [];
  }

  // ✅ Normalize each line and compute taxAmt if missing
  const normalized = (linesRaw || []).map((l: any) => {
    const qty = Number(l?.qty ?? l?.Qty ?? 0);
    const price = Number(l?.price ?? l?.unitPrice ?? l?.UnitPrice ?? 0);
    const discountPct = Number(l?.discount ?? l?.discountPct ?? l?.DiscountPct ?? 0);

    // gross & discount
    const gross = qty * price;
    const discAmt = gross * (discountPct / 100);
    const netBeforeTax = gross - discAmt;

    // take taxAmt from any known field
    const taxAmtFromApi =
      Number(l?.taxAmt ?? l?.taxAmount ?? l?.TaxAmt ?? l?.TaxAmount ?? 0);

    // if taxAmt not provided, try derive from total - netBeforeTax
    const total = Number(l?.total ?? l?.lineTotal ?? l?.Total ?? 0);
    const computedTax =
      taxAmtFromApi > 0
        ? taxAmtFromApi
        : (total > 0 ? +(total - netBeforeTax).toFixed(2) : 0);

    return {
      ...l,
      qty,
      price,
      discount: discountPct,
      taxAmt: computedTax,
      total: total || +(netBeforeTax + computedTax).toFixed(2)
    };
  });

  // ✅ Total remains sum of total (as before)
  const total = normalized.reduce((sum, l) => sum + (Number(l?.total) || 0), 0);

  this.modalLines = normalized;
  this.modalLocation = row?.location || '';
  this.modalTotal = +total.toFixed(2);
  this.showLinesModal = true;
 }


  closeLinesModal(): void {
    this.showLinesModal = false;
  }

  // ================== Drafts ==================

  openDraftsModal(): void {
    this.showDraftsModal = true;
    this.loadDrafts();
  }

  closeDraftsModal(): void {
    this.showDraftsModal = false;
  }

  loadDrafts(): void {
    this.poTempService.getPODrafts().subscribe({
      next: (res: any) => {
        this.drafts = res?.data || [];
      },
      error: (err) => console.error('Error loading PO drafts', err)
    });
  }

  openDraft(d: any): void {
    this.router.navigate(
      ['/purchase/create-purchaseorder'],
      { queryParams: { draftId: d.id } }
    );
    this.closeDraftsModal();
  }

  deleteDraft(id: number): void {
    Swal.fire({
      title: 'Delete draft?',
      text: 'This draft will be permanently removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#dc2626'
    }).then(res => {
      if (res.isConfirmed) {
        this.poTempService.deletePODraft(id).subscribe({
          next: () => {
            this.loadDrafts();
            Swal.fire('Deleted', 'Draft removed', 'success');
          },
          error: (err) => console.error('Error deleting draft', err)
        });
      }
    });
  }

  // ================== Reorder PRs ==================

  openReorderDetails(): void {
    this.showReorderModal = true;
    this.loadReorders();
  }

  closeReorderModal(): void {
    this.showReorderModal = false;
    this.reorderSearch = '';
  }

  private safeParseReorder(raw: any, fallback: any[] = []): any[] {
    if (Array.isArray(raw)) return raw;
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(String(raw));
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  loadReorders(): void {
    forkJoin({
      prs: this.purchaseService.getAll(), // { data: [...] }
      pos: this.poService.getPO()         // { data: [...] }
    }).subscribe({
      next: (results: any) => {
        const prsRes = results?.prs;
        const posRes = results?.pos;

        // 1) collect PR numbers already used by any PO
        const usedPrNos = new Set<string>();
        (posRes?.data || []).forEach((po: any) => {
          const lines = Array.isArray(po?.poLines)
            ? po.poLines
            : this.safeParseReorder(po?.poLines, []);
          (lines || []).forEach((ln: any) => {
            const prNo = (ln?.prNo ?? ln?.PRNo ?? ln?.prno ?? ln?.pr_no ?? '')
              .toString()
              .trim();
            if (prNo) usedPrNos.add(prNo);
          });
        });

        // 2) PRs that are reorder AND not used in any PO
        const list = (prsRes?.data || []).map((req: any) => ({
          ...req,
          prLines: Array.isArray(req.prLines)
            ? req.prLines
            : this.safeParseReorder(req.prLines, []),
        }));

        this.reorderAll = list.filter(
          (r: any) =>
            (r.isReorder === true ||
             r.isReorder === 1 ||
             String(r?.isReorder).toLowerCase() === 'true') &&
            !usedPrNos.has((r.purchaseRequestNo || '').toString().trim())
        );

        this.reorderRows = [...this.reorderAll];
        this.filterReorders();
      },
      error: (err) => console.error('Error loading reorder PRs/POs', err)
    });
  }

  loadReorderCount(): void {
    forkJoin({
      prs: this.purchaseService.getAll(), // PRs
      pos: this.poService.getPO()         // POs
    }).subscribe({
      next: (results: any) => {
        const prs = results?.prs?.data || [];
        const pos = results?.pos?.data || [];

        // 1) PR numbers already used in any PO (search in poLines)
        const usedPrNos = new Set<string>();
        pos.forEach((po: any) => {
          const lines = Array.isArray(po?.poLines)
            ? po.poLines
            : this.safeParseReorder(po?.poLines, []);
          lines.forEach((ln: any) => {
            const prNo = (ln?.prNo ?? ln?.PRNo ?? ln?.prno ?? ln?.pr_no ?? '')
              .toString()
              .trim();
            if (prNo) usedPrNos.add(prNo);
          });
        });

        // 2) Normalize PRs, keep reorder ones
        const reorderPRs = prs
          .map((r: any) => ({
            ...r,
            purchaseRequestNo: (r?.purchaseRequestNo || '').toString().trim(),
            prLines: Array.isArray(r?.prLines)
              ? r.prLines
              : this.safeParseReorder(r?.prLines, []),
            isReorder:
              r?.isReorder === true ||
              r?.isReorder === 1 ||
              String(r?.isReorder).toLowerCase() === 'true'
          }))
          .filter((r: any) => r.isReorder);

        // 3) Available PRs (not used by any PO)
        const available = reorderPRs.filter(
          (r: any) => !usedPrNos.has(r.purchaseRequestNo)
        );

        this.reorderAll = reorderPRs;
        this.reorderRows = [...available];

        // 4) set badge count
        this.reorderCount = available.length;
      },
      error: (err) => console.error('Error computing reorder count', err)
    });
  }

  // Client-side search inside Reorder modal
  filterReorders(): void {
    const q = (this.reorderSearch || '').trim().toLowerCase();
    if (!q) {
      this.reorderRows = [...this.reorderAll];
      return;
    }

    this.reorderRows = this.reorderAll.filter((r: any) => {
      const prNo = (r.purchaseRequestNo || r.prNo || '').toString().toLowerCase();
      const req = (r.requester || '').toString().toLowerCase();
      const dep = (r.department || r.departmentName || '').toString().toLowerCase();
      const dd = this.datePipe.transform(r.deliveryDate, 'dd-MM-yyyy')?.toLowerCase() || '';

      return (
        prNo.includes(q) ||
        req.includes(q) ||
        dep.includes(q) ||
        dd.includes(q)
      );
    });
  }

  // when user clicks "Create" on a reorder PR
  createFromReorder(pr: any): void {
    this.router.navigate(
      ['/purchase/create-purchaseorder'],
      { queryParams: { fromReorderPrId: pr.id } }
    );
    this.closeReorderModal();
  }
  openQr(row: any): void {
  const poNo = row?.purchaseOrderNo;
  if (!poNo) return;

  this.qrPoNo = poNo;
  this.showQrModal = true;

  this.poService.getPoQr(poNo).subscribe({
    next: (res: any) => {
      this.qrPayloadUrl = res.qrPayloadUrl;
      this.qrImgBase64 = res.qrCodeSrcBase64;
    },
    error: err => {
      this.showQrModal = false;
      Swal.fire('Error', 'Failed to load QR', 'error');
    }
  });
}

closeQr(): void {
  this.showQrModal = false;
  this.qrPoNo = '';
  this.qrPayloadUrl = '';
  this.qrImgBase64 = '';
}

copyQrLink(): void {
  if (this.qrPayloadUrl) {
    navigator.clipboard.writeText(this.qrPayloadUrl);
    Swal.fire('Copied', 'QR link copied', 'success');
  }
}
 openPendingPrAlerts() {
    this.showPendingPrModal = true;
    this.loadPendingPrAlerts();
    setTimeout(() => feather.replace());
  }

  closePendingPrModal() {
    this.showPendingPrModal = false;
  }

  loadPendingPrAlerts() {
    // PR status: Pending = 1 :contentReference[oaicite:2]{index=2}
    this.purchaseService.getAll().subscribe({
      next: (res: any) => {
        const list = res?.data ?? [];
        this.pendingPrList = list.filter((x: any) => +x.status === 1);
        this.pendingPrCount = this.pendingPrList.length;
        setTimeout(() => feather.replace());
      },
      error: () => {
        this.pendingPrList = [];
        this.pendingPrCount = 0;
      }
    });
  }

  loadPendingPrCount() {
  this.purchaseService.getAll().subscribe({
    next: (res: any) => {
      const list = res?.data ?? [];
      // Pending status = 1
      this.pendingPrList = list.filter((x: any) => +x.status === 1);
      this.pendingPrCount = this.pendingPrList.length;

      setTimeout(() => feather.replace());
    },
    error: () => {
      this.pendingPrList = [];
      this.pendingPrCount = 0;
    }
  });
}
  filteredPendingPrList(): any[] {
    const v = (this.pendingPrSearch || '').toLowerCase().trim();
    if (!v) return this.pendingPrList;

    return this.pendingPrList.filter((p: any) =>
      (p.purchaseRequestNo || '').toLowerCase().includes(v) ||
      (p.requester || '').toLowerCase().includes(v) ||
      (p.departmentName || '').toLowerCase().includes(v) 
    );
  }
    private getPrLocation(p: any): string {
  try {
    const lines = Array.isArray(p?.prLines)
      ? p.prLines
      : JSON.parse(p?.prLines || '[]');

    if (!Array.isArray(lines) || lines.length === 0) return '';

    // take first line locationSearch (or join if multiple)
    const locs = lines
      .map((l: any) => (l?.locationSearch || l?.location || '').toString().trim())
      .filter((x: string) => !!x);

    // if same location for all lines, show one
    const uniq = Array.from(new Set(locs));
    return uniq.join(', ');
  } catch {
    return '';
  }
}

  createPoFromPr(pr: any) {
    // Redirect to Create PO with PR id
    this.showPendingPrModal = false;
    this.router.navigate(['/purchase/create-purchaseorder'], {
      queryParams: { prId: pr.id }
    });
  }

  trackByPrId(_: number, pr: any) {
    return pr?.id ?? _;
  }

  private async ensurePdfMakeReady(): Promise<any> {
  if (this._pdfReady && this._pdfMake) return this._pdfMake;

  const pdfMakeMod: any = await import('pdfmake/build/pdfmake');
  const pdfFontsMod: any = await import('pdfmake/build/vfs_fonts');

  const pdfMake = pdfMakeMod?.default || pdfMakeMod;

  const vfs =
    pdfFontsMod?.pdfMake?.vfs ||
    pdfFontsMod?.default?.pdfMake?.vfs ||
    pdfFontsMod?.vfs ||
    pdfFontsMod?.default?.vfs ||
    pdfFontsMod?.pdfMake?.vfs;

  if (!vfs) throw new Error('pdfMake vfs not found. Ensure pdfmake & vfs_fonts installed.');

  pdfMake.vfs = vfs;
  this._pdfMake = pdfMake;
  this._pdfReady = true;
  return pdfMake;
}
private async getCanvasLogoDataUrl(): Promise<string> {
  if (this._logoDataUrl) return this._logoDataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // 1x1 png fallback
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8kKkAAAAASUVORK5CYII=';
  }

  ctx.fillStyle = '#2E5F73';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px Arial';
  ctx.fillText('UnityWorks', 34, 82);

  ctx.fillStyle = '#DDEFF6';
  ctx.font = '22px Arial';
  ctx.fillText('Purchase Order', 36, 118);

  this._logoDataUrl = canvas.toDataURL('image/png');
  return this._logoDataUrl;
}
openPoPdfPreview(row: any) {
  this.poPdfMeta = row;
  this.showPoPdfModal = true;
  this.lockBodyScroll();

  this.poPdfLoading = true;
  this.clearPoPdfPreview();

  this.poService.getPOById(row.id).subscribe({
    next: async (res: any) => {
      try {
        const po = res?.data ?? res;
        const dto = this.buildPoPrintDto(po);
        const blob = await this.generatePoPdfBlob(dto);

        this.poPdfBlob = blob;
        const url = URL.createObjectURL(blob);
        this.poPdfObjectUrl = url;

        const hash = '#toolbar=1&navpanes=0&scrollbar=1&view=FitH&zoom=110';
        setTimeout(() => {
          this.poPdfSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url + hash);
        }, 30);

        this.poPdfLoading = false;
        setTimeout(() => feather.replace(), 0);
      } catch (e: any) {
        this.poPdfLoading = false;
        Swal.fire({ icon: 'error', title: 'PDF generate failed', text: String(e?.message || e) });
      }
    },
    error: () => {
      this.poPdfLoading = false;
      Swal.fire('Error', 'Failed to load PO details', 'error');
    }
  });
}


closePoPdfModal() {
  this.showPoPdfModal = false;
  this.poPdfMeta = null;
  this.poPdfLoading = false;
  this.clearPoPdfPreview();
  this.unlockBodyScroll();
}
downloadCurrentPoPdf() {
  if (!this.poPdfBlob) return;

  const fileNo = (this.poPdfMeta?.purchaseOrderNo || 'PurchaseOrder').replace(/[^\w\-]+/g, '_');
  const filename = `${fileNo}.pdf`;

  const url = URL.createObjectURL(this.poPdfBlob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

printCurrentPoPdf() {
  if (!this.poPdfBlob) return;

  const url = URL.createObjectURL(this.poPdfBlob);
  const w = window.open(url, '_blank');
  if (!w) {
    Swal.fire({ icon: 'info', title: 'Popup blocked', text: 'Allow popups to print.' });
    URL.revokeObjectURL(url);
    return;
  }
  w.onload = () => {
    w.focus();
    w.print();
  };
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
private buildPoPrintDto(row: any): PurchaseOrderPrintDTO {
  let linesRaw: any[] = [];
  try {
    linesRaw = Array.isArray(row?.poLines) ? row.poLines : JSON.parse(row?.poLines || '[]');
  } catch {
    linesRaw = [];
  }

  // ✅ build lines + compute line discount/tax if available
  let computedSubTotal = 0;
  let computedDiscLines = 0;
  let computedTaxLines = 0;

  const lines = (linesRaw || []).map((l: any) => {
    const qty = Number(l?.qty ?? l?.Qty ?? 0);
    const unitPrice = Number(l?.price ?? l?.unitPrice ?? l?.UnitPrice ?? 0);

    // try common discount fields
    const discPct = Number(l?.discountPct ?? l?.discount ?? l?.DiscountPct ?? 0);

    // try common tax amount field
    const taxAmt = Number(l?.taxAmt ?? l?.taxAmount ?? l?.TaxAmt ?? 0);

    // base line total
    const gross = qty * unitPrice;
    const discAmt = gross * (discPct / 100);

    // prefer API totals if present
    const amount =
      Number(l?.total ?? l?.lineTotal ?? l?.amount ?? l?.Total) ||
      (gross - discAmt + taxAmt);

    computedSubTotal += (Number(l?.lineNet ?? l?.net ?? l?.LineNet) || (gross - discAmt));
    computedDiscLines += discAmt;
    computedTaxLines += taxAmt;

    return {
      description: String(l?.item ?? l?.description ?? l?.itemName ?? '-'),
      qty,
      uom: String(l?.uom ?? l?.UOM ?? l?.uomName ?? 'UOM'),
      unitPrice,
      amount,
      taxCode: String(l?.taxCode ?? l?.taxCodeName ?? l?.taxName ?? l?.TaxCode ?? '-'),
      discountPct: Number(l?.discountPct ?? l?.discount ?? l?.DiscountPct ?? 0),
      taxAmt: Number(l?.taxAmt ?? l?.taxAmount ?? l?.TaxAmt ?? 0),

    };
  });

  // ✅ read from row first (if your API already provides), else use computed values
  const subTotal = Number(row?.subTotal ?? row?.subtotal ?? row?.SubTotal) || +computedSubTotal.toFixed(2);

  const discountLines =
    Number(row?.discountLines ?? row?.discountLineAmount ?? row?.DiscountLines) ||
    +computedDiscLines.toFixed(2);

  const discountAbsolute =
    Number(row?.discountAbsolute ?? row?.discountAmt ?? row?.DiscountAbsolute ?? row?.Discount) || 0;

  const taxLines =
    Number(row?.taxLines ?? row?.taxLineAmount ?? row?.TaxLines) ||
    +computedTaxLines.toFixed(2);

  const shippingCost =
  Number(row?.shippingCost ?? row?.shipping ?? row?.ShippingCost) || 0;

// ✅ Real tax percent from PO/DB (THIS is what header should show)
const taxPct =
  Number(
    row?.taxPct ??
    row?.taxPercentage ??
    row?.TaxPct ??
    row?.tax ??
    row?.Tax
  ) || 0;

  // ✅ Effective tax ONLY for shipping-tax calculation
  // Rule: if shipping > 0 and taxPct is 0 => default 9%, else use taxPct
  const shippingTaxPct =
    (shippingCost > 0 && taxPct <= 0) ? 9 : taxPct;

  // ✅ compute shipping tax amount
  const computedShippingTax =
    (shippingCost > 0 && shippingTaxPct > 0)
      ? +((shippingCost * shippingTaxPct) / 100).toFixed(2)
      : 0;

  // ✅ if backend sends already, take it; else compute
  const taxPctAmt =
    Number(row?.taxPctAmt ?? row?.TaxPctAmt ?? row?.shippingTaxPctAmt) || computedShippingTax;

  // ✅ Net = (SubTotal - discounts + taxLines) + (Shipping + shippingTax)
  const baseForNet = (subTotal - discountLines - discountAbsolute + taxLines);
  const shippingPlusTax = +(shippingCost + taxPctAmt).toFixed(2);

  const netTotal =
    Number(row?.netTotal ?? row?.NetTotal ?? row?.totalAmount ?? row?.TotalAmount) ||
    +(baseForNet + shippingPlusTax).toFixed(2);

   const supplierName = (row?.supplierName || 'Supplier').toString().trim();

  const deliverTo = (row?.deliveryTo || row?.location || row?.deliveryAddress || '').toString().trim(); 

  return {
    purchaseOrderNo: String(row?.purchaseOrderNo || ''),
    poDate: row?.poDate,
    deliveryDate: row?.deliveryDate,
    currency: String(row?.currencyName || row?.currency || 'INR'),
    terms: String(row?.terms || row?.paymentTermName || ''),

    orderTo: supplierName,
    billTo: `${this.companyInfo.name}\n${this.companyInfo.address1}\n${this.companyInfo.address2}\n${this.companyInfo.phone}`,
    deliverTo: deliverTo || '-',
    remarks: String(row?.remarks || row?.remark || ''),

    lines,

    subTotal,
    discountLines,
    discountAbsolute,
    taxLines,
    shippingCost,

    // ✅ IMPORTANT:
    // Header should show ONLY real taxPct (not default 9)
    taxPct,

    // ✅ this is shipping tax amount (computed using 9% only when taxPct=0 & shipping>0)
    taxPctAmt,

    netTotal
  };

}

private formatDate(d: any) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

private n(v: any, dec: number) {
  const x = Number(v ?? 0);
  return x.toFixed(dec);
}

private async generatePoPdfBlob(dto: PurchaseOrderPrintDTO): Promise<Blob> {
  const pdfMake: any = await this.ensurePdfMakeReady();
  const logoDataUrl = await this.getCanvasLogoDataUrl();

  // --------------------------
  // Lines table (now with TaxCode + Discount% + TaxAmt)
  // --------------------------
  const body: any[] = [];

  body.push([
    { text: 'Sl.No', style: 'th', alignment: 'center' },
    { text: 'Description', style: 'th' },
    { text: 'Tax Code', style: 'th', alignment: 'center' },
    { text: 'Qty', style: 'th', alignment: 'right' },
    { text: 'UOM', style: 'th', alignment: 'center' },
    { text: `Unit Price (${dto.currency})`, style: 'th', alignment: 'right' },
    { text: 'Discount %', style: 'th', alignment: 'right' },
    { text: `Tax Amt (${dto.currency})`, style: 'th', alignment: 'right' },
    { text: `Amount (${dto.currency})`, style: 'th', alignment: 'right' }
  ]);

  (dto.lines || []).forEach((l, i) => {
    const taxCode = (l?.taxCode ?? '-').toString();
    const discPct = Number(l?.discountPct ?? 0);
    const taxAmt = Number(l?.taxAmt ?? 0);

    body.push([
      { text: String(i + 1), style: 'td', alignment: 'center' },
      { text: l.description || '-', style: 'td' },
      { text: taxCode, style: 'td', alignment: 'center' },
      { text: this.n(l.qty, 2), style: 'td', alignment: 'right' },
      { text: l.uom || '-', style: 'td', alignment: 'center' },
      { text: this.n(l.unitPrice, 3), style: 'td', alignment: 'right' },
      { text: this.n(discPct, 2), style: 'td', alignment: 'right' },
      { text: this.n(taxAmt, 2), style: 'td', alignment: 'right' },
      { text: this.n(l.amount, 2), style: 'td', alignment: 'right' }
    ]);
  });

  if (!dto.lines?.length) {
    body.push([
      { text: 'No line items', colSpan: 9, alignment: 'center', margin: [0, 12, 0, 12] },
      {}, {}, {}, {}, {}, {}, {}, {}
    ]);
  }

  // --------------------------
  // Totals box (your existing totals)
  // --------------------------
  const totalsBody = [
    [{ text: 'Sub Total', style: 'totLabel' }, { text: this.n(dto.subTotal, 2), style: 'totVal' }],
    [{ text: 'Discount (Lines)', style: 'totLabel' }, { text: this.n(dto.discountLines, 2), style: 'totVal' }],
    [{ text: 'Discount (absolute)', style: 'totLabel' }, { text: this.n(dto.discountAbsolute, 2), style: 'totVal' }],
    [{ text: 'Tax (Lines)', style: 'totLabel' }, { text: this.n(dto.taxLines, 2), style: 'totVal' }],
    [{ text: 'Shipping Cost', style: 'totLabel' }, { text: this.n(dto.shippingCost, 2), style: 'totVal' }],
    [{ text: 'Shipping + TaxPctAmt', style: 'totLabel' }, { text: this.n(dto.shippingCost + dto.taxPctAmt, 2), style: 'totVal' }],
    [{ text: 'Net Total', style: 'totLabelBold' }, { text: `${this.n(dto.netTotal, 2)} ${dto.currency}`, style: 'totValBold' }]
  ];

  // --------------------------
  // PDF definition
  // --------------------------
  const dd: any = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [24, 18, 24, 28],
    defaultStyle: { fontSize: 10, color: '#111827' },

    content: [
      // Header row
      {
        columns: [
          {
            width: 180,
            stack: [
              { image: logoDataUrl, width: 165, height: 45, margin: [0, 0, 0, 6] },
              { text: this.companyInfo.name, style: 'compName' },
              { text: this.companyInfo.address1, style: 'compText' },
              { text: this.companyInfo.address2, style: 'compText' },
              { text: `${this.companyInfo.phone}  |  ${this.companyInfo.fax}`, style: 'compText' },
              { text: this.companyInfo.gst, style: 'compText' }
            ]
          },
          {
            width: '*',
            stack: [
                { text: 'PURCHASE ORDER', style: 'docTitle', alignment: 'right' },
                { text: `PO No : ${dto.purchaseOrderNo}`, style: 'meta', alignment: 'right' },
                { text: `PO Date : ${this.formatDate(dto.poDate)}`, style: 'meta', alignment: 'right' },
                { text: `Delivery : ${this.formatDate(dto.deliveryDate)}`, style: 'meta', alignment: 'right' },
                { text: `Currency : ${dto.currency || '-'}`, style: 'meta', alignment: 'right' },

                // ✅ ALWAYS show tax line (even 0.00%)
                { text: `Tax % : ${this.n(dto.taxPct ?? 0, 2)}%`, style: 'meta', alignment: 'right' },

                // ✅ show terms only if exists
                ...(dto.terms ? [{ text: `Terms : ${dto.terms}`, style: 'meta', alignment: 'right' }] : [])
                          ].filter((x: any) => !!x.text)
          }
        ],
        columnGap: 10
      },

      // 3 blocks
      {
        margin: [0, 14, 0, 10],
        columns: [
          this.makeBlock('Order To', dto.orderTo || '-'),
          this.makeBlock('Bill To', dto.billTo || '-'),
          this.makeBlock('Deliver To', dto.deliverTo || '-')
        ],
        columnGap: 10
      },

      // Remarks
      dto.remarks
        ? {
            margin: [0, 0, 0, 10],
            table: {
              widths: ['*'],
              body: [[
                {
                  stack: [
                    { text: 'Remarks', style: 'boxHead' },
                    { text: dto.remarks, style: 'boxText' }
                  ],
                  margin: [8, 6, 8, 6]
                }
              ]]
            },
            layout: {
              fillColor: () => '#F6FAFC',
              hLineColor: () => '#D9E2E8',
              vLineColor: () => '#D9E2E8'
            }
          }
        : {},

      // Lines table (updated columns)
      {
        table: {
          headerRows: 1,
          widths: [30, '*', 55, 40, 40, 60, 55, 60, 60],
          body
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return '#2E5F73';
            return rowIndex % 2 === 0 ? '#F3F6F8' : null;
          },
          hLineColor: () => '#D9E2E8',
          vLineColor: () => '#D9E2E8',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 5,
          paddingBottom: () => 5
        }
      },

      // Totals box
      {
        margin: [0, 12, 0, 0],
        columns: [
          { width: '*', text: '' },
          {
            width: 260,
            table: { widths: ['*', 110], body: totalsBody },
            layout: {
              fillColor: (row: number) => (row === 2 ? '#EEF6F2' : null),
              hLineColor: () => '#D9E2E8',
              vLineColor: () => '#D9E2E8',
              paddingLeft: () => 8,
              paddingRight: () => 8,
              paddingTop: () => 6,
              paddingBottom: () => 6
            }
          }
        ]
      }
    ],

    footer: (currentPage: number, pageCount: number) => ({
      margin: [24, 0, 24, 0],
      columns: [
        { text: `Printed on : ${this.formatDate(new Date())}`, fontSize: 8, color: '#6b7280' },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 8, color: '#6b7280' }
      ]
    }),

    styles: {
      docTitle: { fontSize: 16, bold: true, color: '#111827' },
      compName: { fontSize: 12, bold: true, color: '#0f172a' },
      compText: { fontSize: 9, color: '#334155' },
      meta: { fontSize: 9, color: '#334155' },

      th: { color: '#ffffff', bold: true, fontSize: 9 },
      td: { fontSize: 9, color: '#111827' },

      totLabel: { fontSize: 10, color: '#111827' },
      totVal: { fontSize: 10, alignment: 'right', color: '#111827' },
      totLabelBold: { fontSize: 10, bold: true, color: '#111827' },
      totValBold: { fontSize: 10, bold: true, alignment: 'right', color: '#111827' },

      boxHead: { fontSize: 9, bold: true, color: '#2E5F73' },
      boxText: { fontSize: 10, color: '#111827' }
    }
  };

  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(dd).getBlob((blob: Blob) => resolve(blob));
    } catch (e) {
      reject(e);
    }
  });
}


private makeBlock(title: string, value: string) {
  return {
    width: '*',
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: title, style: 'boxHead' },
          { text: value || '-', style: 'boxText' }
        ],
        margin: [8, 6, 8, 6]
      }]]
    },
    layout: {
      fillColor: () => '#F6FAFC',
      hLineColor: () => '#D9E2E8',
      vLineColor: () => '#D9E2E8'
    }
  };
}

async sendPoEmail(row: any, closeAfterSuccess = false) {
  const res: any = await this.poService.getPOById(row.id).toPromise();
  const po = res?.data ?? res;

  const dto = this.buildPoPrintDto(po);
  const blob = await this.generatePoPdfBlob(dto);

  const fd = new FormData();
  fd.append('pdf', blob, `${dto.purchaseOrderNo}.pdf`);

  this.poService.emailSupplierPo(row.id, fd).subscribe({
    next: () => {
      Swal.fire('Sent', 'PO Emailed to supplier', 'success');

      // ✅ close modal only after success
      this.closeEmailConfirmModal(true);

      // ensure flag reset
      this.emailSending = false;
    },
    error: () => {
      Swal.fire('Error', 'Failed to send email', 'error');

      // keep modal open, just stop loader
      this.emailSending = false;
    }
  });
}



openEmailConfirm(row: any) {
  // Only approved
  if (!row || row.approvalStatus !== 2) return;

  this.emailConfirmRow = row;
  this.showEmailConfirmModal = true;
}

closeEmailConfirmModal(force = false) {
  if (this.emailSending && !force) return; // keep user-block while sending
  this.showEmailConfirmModal = false;
  this.emailConfirmRow = null;
  this.emailSending = false;
}

confirmSendEmail() {
  if (!this.emailConfirmRow) return;

  this.emailSending = true;

  // call existing method, but tell it to close on success
  this.sendPoEmail(this.emailConfirmRow, true);
}
}
