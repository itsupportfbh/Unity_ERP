import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { PackingService } from '../picking-packing.service';
import { SalesOrderService } from '../../sales-order/sales-order.service';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import Swal from 'sweetalert2';
import { ActivatedRoute } from '@angular/router';

type Row = {
  id: number;
  pickId: number;
  soLineId: number;
  itemId: number;
  sku: string;
  itemName: string;
  warehouseId: number;
  warehouseName?: string;
  supplierId: number;
  supplierName: string;
  binId: number;
  bin?: string | null;
  quantity: number;
  cartonId?: number | null;
};

type SoLite = {
  id: number;
  number?: string;
  QuotationNumber?: string;
  customerName: string;
  soDate?: string;
  deliveryDate?: string;
  lineItems?: Row[];
  salesOrderNo: string
};

type Carton = { id: number; name: string };

type SoHdr = {
  id?: number;
  QuotationNumber?: string;
  customerName?: string;
  soDate?: string;
  deliveryDate?: string;
  lineItems?: Row[];

  // codes (unchanged names)
  barCode?: string | null;
  qrCode?: string | null;
  barCodeSrc?: string | null;  // base64 or data-url if API ever sends here
  qrCodeSrc?: string | null;   // base64 or data-url if API ever sends here
};

type CodesResp = {
  barCode?: string | null;
  qrCode?: string | null;
  qrText?: string | null;
  barCodeSrcBase64?: string | null;
  qrCodeSrcBase64?: string | null;
};


@Component({
  selector: 'app-picking-packingcreate',
  templateUrl: './picking-packingcreate.component.html',
  styleUrls: ['./picking-packingcreate.component.scss']
})
export class PickingPackingcreateComponent implements OnInit {


  invalidCartonRowIds = new Set<number>();
  // -------- Header / dropdown ----------
  soList: SoLite[] = [];
  selectedSoId: number | null = null;
  soHdr: SoHdr | null = null;

  // -------- Grid ----------
  rows: Row[] = [];
  totalDeliverQty = 0;

  // Code images
  barCodeSrc: string = '';
  qrCodeSrc: string = '';
  cartonOptions: Carton[];

  isEdit = false;
  pickId: number | null = null;


  constructor(
    private salesOrderService: SalesOrderService,
    private packingService: PackingService,
    private router: Router,
    private route : ActivatedRoute
  ) { }

  ngOnInit(): void {
    debugger
    this.salesOrderService.getSO().subscribe({
      next: (res: any) => {
        const items = res?.data ?? [];   // <-- use data from the wrapper
        this.soList = items.map((s: any) => ({
          ...s,
          number: s.number ?? s.QuotationNumber
        }));
      },
      error: err => {
        console.error('Failed to load SO list', err);
        this.soList = [];
      }
    });

    const paramId = Number(this.route.snapshot.paramMap.get('id'));
    if (paramId && !Number.isNaN(paramId)) {
      this.isEdit = true;
      this.pickId = paramId;
      this.loadForEdit(paramId);                   // NEW
    }
  }

  private ensureDataUrl(b64?: string | null): string {
    if (!b64) return '';
    if (/^data:image\//i.test(b64)) return b64;
    return `data:image/png;base64,${b64}`;
  }

  /** Load an existing Picking and hydrate the screen (EDIT mode) */
  private loadForEdit(id: number) {
    this.packingService.getPackingById(id).subscribe({
      next: (res: any) => {
        const p = res?.data ?? res ?? null;
        if (!p) return;

        // Set the selected SO and lock the dropdown (HTML disables when isEdit = true)
        this.selectedSoId = p.soId ?? null;

        // Header values
        this.soHdr = {
          id: p.id,
          customerName: p.customerName ?? '',
          soDate: p.soDate ?? p.requestedDate ?? null,
          deliveryDate: p.deliveryDate ?? null,
          barCode: p.barCode ?? null,
          qrCode: p.qrCode ?? null,
        };

        // Images (accept raw base64 or data URLs)
        this.barCodeSrc = this.ensureDataUrl(p.barCodeSrc ?? p.barCodeSrcBase64);
        this.qrCodeSrc = this.ensureDataUrl(p.qrCodeSrc ?? p.qrCodeSrcBase64);

        // Lines into your Row shape
        const lines = (p.lineItems ?? p.lines ?? []).map((m: any, i: number) => ({
          id: m.id ?? (i + 1),           // fallback id
          pickId: p.id,
          soLineId: m.soLineId,
          itemId: m.itemId,
          sku: m.sku ?? '',
          itemName: m.itemName ?? '',
          warehouseId: m.warehouseId,
          warehouseName: m.warehouseName,
          supplierId: m.supplierId,
          supplierName: m.supplierName ?? '',
          binId: m.binId ?? m.bin,
          bin: m.bin ?? null,
          quantity: m.quantity ?? m.qty ?? 0,
          cartonId: m.cartonId ?? null
        }));

        this.rows = lines;
        this.cartonOptions = this.buildCartons(this.rows.length);
        this.recalcTotals();
      },
      error: err => {
        console.error('Failed to load picking detail', err);
      }
    });
  }

  // ------- helpers -------
  private normalizeHdr(hdr: any): any {
    // Some APIs return array; convert to object safely
    if (Array.isArray(hdr)) return hdr[0] ?? {};
    return hdr ?? {};
  }

  private pickLines(hdr: any): Row[] {
    const obj = this.normalizeHdr(hdr);
    const lines: Row[] = (obj?.lines ?? obj?.lineItems ?? []) as Row[];

    // Normalize only what template expects
    return lines.map((m: any) => ({
      ...m,
      warehouseName: m.warehouseName ?? m.warehouseName,
      pickBin: m.pickBin ?? m.bin ?? null
    }));
  }
  // ------- UI events -------
  onSoChanged(soId: number | null) {
    debugger
    this.rows = [];
    this.totalDeliverQty = 0;
    this.soHdr = null;
    this.barCodeSrc = '';
    this.qrCodeSrc = '';
    if (!soId) return;

    // make the streams explicit and typed
    const hdr$: Observable<any> = this.salesOrderService.getSOById(soId) as unknown as Observable<any>;
    const codes$: Observable<CodesResp> = this.packingService.getPackingCodes(soId) as unknown as Observable<CodesResp>;

    forkJoin({ hdr: hdr$, codes: codes$ }).subscribe({
      next: ({ hdr, codes }) => {
        const hdrPayload = (hdr as any)?.data ?? hdr;
        const H: any = Array.isArray(hdrPayload) ? (hdrPayload[0] ?? {}) : (hdrPayload ?? {});
        const lines = this.pickLines(H);

        this.soHdr = { ...H, lineItems: lines, soDate: hdr.data.requestedDate, deliveryDate: hdr.data.deliveryDate, barCode: codes?.barCode ?? null, qrCode: codes?.qrText ?? null };

        // show images
        this.barCodeSrc = codes?.barCodeSrcBase64 ?? '';
        this.qrCodeSrc = codes?.qrCodeSrcBase64 ?? '';

        const fallback = this.soList.find(s => s.id === this.selectedSoId)?.lineItems ?? [];
        this.rows = (lines?.length ? lines : (fallback ?? [])) as Row[];
        this.cartonOptions = this.buildCartons(this.rows.length);
        this.recalcTotals();
      },
      error: err => {
        console.error('Failed to load SO details/codes', err);
        this.soHdr = null;
      }
    });

  }
  // add inside the component class
  private buildCartons(n: number): Carton[] {
    if (!n || n < 0) n = 0;
    return Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Carton ${i + 1}` }));
  }

  recalcTotals() {
    this.totalDeliverQty = (this.rows ?? []).reduce((sum, r) => sum + (+r.quantity || 0), 0);
  }

  hasAnyDeliverQty(): boolean {
    return (this.rows ?? []).some(r => (r.quantity ?? 0) > 0);
  }

  trackByLine = (_: number, r: Row) => r.id;

  // Header actions
  cancelForm() {
    this.router.navigate(['Sales/Picking-packing-list']);
  }

  private toBase64(dataUrlOrBase64?: string | null): string | null {
    if (!dataUrlOrBase64) return null;
    const i = dataUrlOrBase64.indexOf(',');
    return i >= 0 ? dataUrlOrBase64.substring(i + 1) : dataUrlOrBase64;
  }

  isInvalidCarton = (r: Row) =>
    this.invalidCartonRowIds.has(r.id);

  private validateBeforeSave(): boolean {
    this.invalidCartonRowIds.clear();

    for (const r of this.rows ?? []) {
      const qty = Number(r.quantity ?? 0);
      const needsCarton = qty > 0;
      const hasCarton = r.cartonId !== null && r.cartonId !== undefined;

      if (needsCarton && !hasCarton) {
        this.invalidCartonRowIds.add(r.id);
      }
    }

    if (this.invalidCartonRowIds.size > 0) {
      const firstBadId = [...this.invalidCartonRowIds][0];
      // optional: scroll to first invalid row
      setTimeout(() => {
        document
          .querySelector(`[data-row-id="${firstBadId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);

      Swal.fire({ icon: 'warning', text: 'Please select "Pack to Carton" for Item' });
      return false;
    }
    return true;
  }
  // Save / Generate DO
  saveDo() {
    if (!this.selectedSoId || !this.hasAnyDeliverQty()) return;

    if (!this.validateBeforeSave()) return;

    const payload = {
      id: this.pickId?this.pickId:0,
      soId: this.selectedSoId,
      deliveryDate: this.soHdr?.deliveryDate,
      soDate: this.soHdr?.soDate,
      barCode: this.soHdr.barCode,
      qrCode: this.soHdr.qrCode,
      barCodeSrc: this.toBase64(this.barCodeSrc),
      qrCodeSrc: this.toBase64(this.qrCodeSrc),
      lineItems: this.rows
        .filter(r => (r.quantity ?? 0) > 0)
        .map(r => ({
          id:r.id,
          soLineId: this.selectedSoId,
          itemId: r.itemId,
          warehouseId: r.warehouseId,
          warehouseName: r.warehouseName,
          supplierId: r.supplierId,
          supplierName: r.supplierName,
          binId: r.binId,
          quantity: r.quantity,
          cartonId: r.cartonId ?? null
        }))
    };

    if (this.isEdit && this.pickId) {
      // UPDATE
      this.packingService.updatePacking(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Picking updated successfully',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0e3a4c'
          });
          this.router.navigate(['Sales/Picking-packing-list']);
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to update Picking',
            confirmButtonText: 'OK',
            confirmButtonColor: '#d33'
          });
        }
      });
    }else{
        this.packingService.insertPacking(payload).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Created!',
          text: 'Packing created successfully',
          confirmButtonText: 'OK',
          confirmButtonColor: '#0e3a4c'
        });
        this.router.navigate(['Sales/Picking-packing-list']);
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to create Packing',
          confirmButtonText: 'OK',
          confirmButtonColor: '#d33'
        });
      }
    });
    }

    
  }

  private fmtDate(d?: string | Date | null) {
    if (!d) return '';
    const dd = new Date(d);
    const z = (n: number) => n.toString().padStart(2, '0');
    return `${z(dd.getDate())}-${z(dd.getMonth() + 1)}-${dd.getFullYear()}`;
  }

  async DownloadPickingList() {
    if (!this.soHdr) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();

    // ---- derive header values ----
    const sel = this.soList.find(s => s.id === this.selectedSoId);
    const soDisplay = sel ? `${sel.salesOrderNo ?? ''} — ${sel.customerName ?? ''}`.trim() : '';
    const soDate = this.fmtDate(this.soHdr.soDate);
    const delivDate = this.fmtDate(this.soHdr.deliveryDate);
    const codeText = this.soHdr.barCode || '';

    // ---- title ----
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
    doc.text('Picking & Packing List', 14, 18);

    // ---- left meta block ----
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    const y0 = 28;
    const leftX = 14;
    const midX = pageW / 2 + 2;

    doc.text(`Sales Order: ${soDisplay}`, leftX, y0);
    doc.text(`SO Date: ${soDate}`, leftX, y0 + 6);
    doc.text(`Delivery Date: ${delivDate}`, leftX, y0 + 12);

    // ---- right "card" with images ----
    const cardW = pageW / 2 - 18;
    const cardH = 40;
    doc.setFillColor(246, 248, 250);
    doc.roundedRect(midX, y0 - 8, cardW, cardH, 2, 2, 'F');

    // barcode
    const imgBar = this.barCodeSrc || '';
    const imgQr = this.qrCodeSrc || '';
    const barW = cardW - 54;   // barcode width
    const barH = 16;           // barcode height
    const qrSz = 24;
    const barX = midX + 8;
    const barY = y0 - 2;

    if (imgBar) doc.addImage(imgBar, 'PNG', barX, barY, barW, barH, undefined, 'FAST');

    // barcode caption (same text)
    if (codeText) {
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(codeText, barX, barY + barH + 5);
    }

    // QR image on the right of the card
    const qrX = midX + cardW - qrSz - 8;
    const qrY = y0 - 2;
    if (imgQr) doc.addImage(imgQr, 'PNG', qrX, qrY, qrSz, qrSz, undefined, 'FAST');

    // QR caption: the SAME short code centered under the QR
    if (codeText) {
      doc.setFontSize(9);
      const qrCenter = qrX + qrSz / 2;
      doc.text(codeText, qrCenter, qrY + qrSz + 5, { align: 'center' });
    }

    // ---- table ----
    const body = (this.rows || []).map(r => ([
      r.itemName || '',
      r.warehouseName || (r as any).warehouseName || '',
      r.supplierName || '',
      ((r as any).pickBin ?? r.bin ?? '') + '',
      (r.quantity ?? 0).toString(),
      r.cartonId ? `Carton ${r.cartonId}` : ''
    ]));

    const totalQty = (this.rows ?? []).reduce((s, r) => s + (+r.quantity || 0), 0);

    autoTable(doc, {
      startY: y0 + cardH + 8,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [245, 245, 245], textColor: 20, lineWidth: 0.1 },
      head: [['ITEM', 'WAREHOUSE', 'SUPPLIER', 'BIN', 'QTY', 'PACK TO CARTON']],
      body,
      // Right-align QTY
      columnStyles: {
        4: { halign: 'right' }
      },
      // FOOT row with total qty
      foot: [['', '', '', 'TOTAL QTY', totalQty.toString(), '']],
      footStyles: { fillColor: [245, 245, 245], textColor: 20, fontStyle: 'bold', halign: 'right' }
    });

    // save file
    const fileName = `PickList_${codeText || 'SO'}.pdf`;
    doc.save(fileName);
  }



  // --- below your class members ---
  copy(text: string) {
    try {
      navigator?.clipboard?.writeText(text);
    } catch { /* no-op */ }
  }

  /** Download a data-url or http(s) image to file */
  async downloadImage(src: string | undefined | null, fileName: string) {
    if (!src) return;

    const saveBlob = (blob: Blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName || 'code.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    };

    try {
      // data URL?
      if (/^data:image\//i.test(src)) {
        const base64 = src.split(',')[1] ?? '';
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return saveBlob(new Blob([bytes], { type: 'image/png' }));
      }

      // regular URL -> fetch as blob
      const res = await fetch(src, { mode: 'cors' });
      const blob = await res.blob();
      return saveBlob(blob);
    } catch {
      // fallback: open in new tab
      window.open(src, '_blank');
    }
  }

}
