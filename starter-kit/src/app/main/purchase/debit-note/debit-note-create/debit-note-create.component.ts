// debit-note-create.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { SupplierInvoiceService } from '../../supplier-invoice/supplier-invoice.service';
import { DebitNoteService, DebitNoteDto } from '../debit-note.service';

type LineRow = { item?: string; qty?: number; price?: number; remarks?: string };

@Component({
  selector: 'app-debit-note-create',
  templateUrl: './debit-note-create.component.html',
  styleUrls: ['./debit-note-create.component.scss']
})
export class DebitNoteCreateComponent implements OnInit {

  // debit note id (for edit)
  dnId?: number;
  isEdit = false;

  // header fields
  pinId: number = 0;
  grnId?: number;
  supplierId: number | null = null;
  supplierName = '';
  referenceNo = '';
  reason = 'Short supply';
  noteDate = '';
  userId: string;

  // lines
  retRows: LineRow[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private pinSvc: SupplierInvoiceService,
    private dnSvc: DebitNoteService
  ) {
    this.userId = localStorage.getItem('id') ?? 'System';
  }

  ngOnInit(): void {
    this.setToday();

    // 1) Check if we are EDITING: route `/purchase/edit-debitnote/:id`
    this.route.paramMap.subscribe(pm => {
      const idStr = pm.get('id');
      if (idStr) {
        this.isEdit = true;
        this.dnId = Number(idStr);
        this.loadDebitNote(this.dnId);
      }
    });

    // 2) If NOT edit, we may come from Supplier Invoice with pinId=? (create mode)
    this.route.queryParamMap.subscribe(p => {
      if (this.isEdit) return; // don't override edit data

      this.pinId = Number(p.get('pinId') || 0);
      if (this.pinId > 0) {
        this.loadFromPin(this.pinId);
      } else {
        // pure blank create
        this.retRows = [{}];
      }
    });
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  setToday() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    this.noteDate = `${d.getFullYear()}-${mm}-${dd}`;
  }

  gridColsClass(cols: number) {
    return {
      'grid grid-cols-1 gap-3': true,
      'md:grid-cols-1': cols === 1,
      'md:grid-cols-2': cols === 2,
      'md:grid-cols-3': cols === 3,
      'md:grid-cols-4': cols === 4,
      'md:grid-cols-5': cols === 5,
      'md:grid-cols-6': cols === 6
    };
  }

  // ----------------------------------------------------------------
  // LOAD EXISTING DEBIT NOTE FOR EDIT
  // ----------------------------------------------------------------
  private loadDebitNote(id: number) {
    this.dnSvc.getById(id).subscribe({
      next: (res: any) => {
        const d = res?.data || res;
        if (!d) { return; }

        // map header
        this.dnId = d.id ?? d.Id ?? id;
        this.pinId = d.pinId ?? d.PinId ?? 0;
        this.grnId = d.grnId ?? d.GrnId ?? undefined;
        this.supplierId = d.supplierId ?? d.SupplierId ?? null;
        this.supplierName = d.supplierName ?? d.SupplierName ?? d.name ?? d.Name ?? '';
        this.referenceNo = d.referenceNo ?? d.ReferenceNo ?? '';
        this.reason = d.reason ?? d.Reason ?? this.reason;

        // date → yyyy-MM-dd
        const rawDate = d.noteDate ?? d.NoteDate ?? d.createdDate ?? d.CreatedDate;
        if (rawDate) {
          const dt = new Date(rawDate);
          const mm = String(dt.getMonth() + 1).padStart(2, '0');
          const dd = String(dt.getDate()).padStart(2, '0');
          this.noteDate = `${dt.getFullYear()}-${mm}-${dd}`;
        }

        // lines
        let lines: any[] = [];
        try {
          const rawLines = d.linesJson ?? d.LinesJson ?? '[]';
          lines = JSON.parse(rawLines);
        } catch {
          lines = [];
        }

        this.retRows = (lines || []).map((l: any) => ({
          item: l.item ?? '',
          qty: Number(l.qty ?? 0),
          price: Number(l.unitPrice ?? 0),
          remarks: l.remarks ?? ''
        }));

        if (!this.retRows.length) {
          this.retRows = [{}];
        }
      },
      error: (err) => {
        console.error('Error loading debit note for edit', err);
        Swal.fire('Error', 'Unable to load debit note.', 'error');
      }
    });
  }

  // ----------------------------------------------------------------
  // Load data from PIN (GetDebitNoteSource) + variance (GetThreeWayMatch)
  // (CREATE scenario from Supplier Invoice)
  // ----------------------------------------------------------------
  loadFromPin(pinId: number) {
    // 1) header + lines from SupplierDebitNote/GetDebitNoteSource/{id}
    this.pinSvc.getDebitNoteSource(pinId).subscribe({
      next: (res: any) => {
        const d = res?.data || res;
        if (!d) { return; }

        this.pinId = d.PinId ?? d.pinId ?? pinId;
        this.grnId = d.GrnId ?? d.grnId ?? undefined;
        this.referenceNo = d.GrnNo ?? d.grnNo ?? d.PinNo ?? d.pinNo ?? '';
        this.supplierId = d.SupplierId ?? d.supplierId ?? null;
        this.supplierName = d.Name ?? d.name ?? '';

        // parse PIN lines (for item + price)
        let lines: any[] = [];
        try {
          const raw = d.LinesJson ?? d.linesJson ?? '[]';
          lines = JSON.parse(raw);
        } catch {
          lines = [];
        }

        // initial rows from PIN lines (qty will be variance)
        this.retRows = (lines || []).map((l: any) => ({
          item: l.item ?? '',
          qty: 0,                           // will set from variance
          price: Number(l.unitPrice ?? 0),
          remarks: ''
        }));

        if (!this.retRows.length) {
          this.retRows = [{}];
        }

        // 2) get variance from 3-way match → put into qty
        this.applyVarianceQty(this.pinId);
      },
      error: (err) => {
        console.error('Error loading PIN source for debit note', err);
      }
    });
  }

  // Use GetThreeWayMatch to set qty = variance
  private applyVarianceQty(pinId: number) {
    this.pinSvc.getThreeWayMatch(pinId).subscribe({
      next: (mRes: any) => {
        const m = mRes?.data || mRes;
        if (!m) { return; }

        const variance = Number(
          m.grnVarianceQty ?? m.GrnVarianceQty ?? 0
        );

        if (this.retRows.length > 0) {
          this.retRows[0].qty = variance;   // single-line variance
        }

        console.log('3-way match:', m);
        console.log('Applied variance qty:', variance);
      },
      error: (err) => {
        console.error('Error loading 3-way match for variance qty', err);
      }
    });
  }

  // ----------------------------------------------------------------
  // Lines helpers
  // ----------------------------------------------------------------
  retAddRow() { this.retRows = [...this.retRows, {}]; }
  retRemoveRow(i: number) { this.retRows = this.retRows.filter((_, idx) => idx !== i); }
  trackByIndex(index: number) { return index; }

  // compute total = Σ (qty * price)
  get totalAmount(): number {
    return this.retRows.reduce((s, r) =>
      s + (Number(r.qty) || 0) * (Number(r.price) || 0), 0);
  }

save(post: boolean = false) {
  if (!this.supplierId) {
    Swal.fire('Validation', 'Please select supplier.', 'warning');
    return;
  }

  const linesJson = JSON.stringify(this.retRows || []);

  const payload: DebitNoteDto = {
    id: this.dnId,                    // needed for update
    supplierId: this.supplierId,
    pinId: this.pinId || undefined,
    grnId: this.grnId,
    referenceNo: this.referenceNo,
    reason: this.reason,
    noteDate: this.noteDate,          // yyyy-MM-dd
    amount: this.totalAmount,
    linesJson,
    status: post ? 1 : 0,             // 0 = draft, 1 = posted
    createdBy: this.userId,
    updatedBy: this.userId
  };

  const request$ = this.isEdit && this.dnId
    ? this.dnSvc.update(this.dnId, payload)
    : this.dnSvc.create(payload);

  request$.subscribe({
    next: (res: any) => {
      const isSuccess = res?.isSuccess !== false;
      if (!isSuccess) {
        Swal.fire('Error', res?.message || 'Failed to save debit note.', 'error');
        return;
      }

      // 🔹 common function to show final success message + navigate
      const finishWithMessage = (warnInstead = false) => {
        let title = '';
        let text  = '';

        if (this.isEdit) {
          title = warnInstead ? 'Updated (with warning)' : 'Updated';
          text  = post
            ? 'Debit Note updated and posted.'
            : 'Debit Note updated (saved as draft).';
        } else {
          title = warnInstead ? 'Saved (with warning)' : 'Saved';
          text  = post
            ? 'Debit Note created and posted.'
            : 'Debit Note created as draft.';
        }

        Swal.fire(title, text, warnInstead ? 'warning' : 'success').then(() => {
          this.router.navigate(['/purchase/list-debitnote']);
        });
      };

      // 🔹 If posting and we have a PIN, call MarkDebitNote (sets SupplierInvoicePin.Status = 2)
      if (post && this.pinId > 0) {
        this.pinSvc.markDebitNote(this.pinId).subscribe({
          next: () => {
            // PIN status updated OK
            finishWithMessage(false);
          },
          error: (err) => {
            console.error('MarkDebitNote failed', err);
            // Debit Note is saved, but PIN status not updated
            finishWithMessage(true);
          }
        });
      } else {
        // Draft or no PIN – just show normal success
        finishWithMessage(false);
      }
    },
    error: (err) => {
      console.error('Save debit note failed', err);
      Swal.fire('Error', 'Failed to save debit note.', 'error');
    }
  });
}

  goToDebitNoteList() {
    this.router.navigate(['/purchase/list-debitnote']);
  }

  // supplier display in header
  get supplierDisplay(): string {
    return this.supplierName || 'Select supplier';
  }
}
