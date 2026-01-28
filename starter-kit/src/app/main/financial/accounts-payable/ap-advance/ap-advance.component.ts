// src/app/main/financial/accounts-payable/ap-advance-create/ap-advance.component.ts

import {
  Component,
  OnInit,
  ViewEncapsulation,
  HostListener
} from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { AccountsPayableService } from '../accounts-payable.service';
import { SupplierService } from 'app/main/businessPartners/supplier/supplier.service';
import { PurchaseGoodreceiptService } from 'app/main/purchase/purchase-goodreceipt/purchase-goodreceipt.service';

interface SimpleSupplier {
  id: number;
  name: string;
}

interface GRNHeader {
  id: number;
  grnNo: string;
  poid: number;
  poNo?: string | number;
  supplierId?: number;
  supplierName?: string;
  grnJson?: string;
  poLines?: string;
  currencyId?: number;
  tax?: number;
}

@Component({
  selector: 'app-ap-advance',
  templateUrl: './ap-advance.component.html',
  styleUrls: ['./ap-advance.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ApAdvanceComponent implements OnInit {

  // ===== form fields =====
  supplierId: number | null = null;
  supplierName: string | null = null;

  advanceDate: string;
  amount: number = 0;
  referenceNo: string = '';
  notes: string = '';

  methodId: number = 2; // 1=Cash,2=Bank,3=Cheque,4=Other
  bankHeadId: number | null = null;

  // GRN fields
  grnId: number | null = null;
  grnNo: string = '';

  // ===== lookups =====
  suppliers: SimpleSupplier[] = [];
  bankAccounts: any[] = [];

  // GRN combobox state
  grnOpen = false;
  grnSearch = '';
  grnList: GRNHeader[] = [];
  grnFiltered: GRNHeader[] = [];

  // bank balance preview
  bankAvailableBalance: number | null = null;
  bankBalanceAfterAdvance: number | null = null;
  bankName: string | null = null;

  saving = false;

  constructor(
    private apSvc: AccountsPayableService,
    private supplierSvc: SupplierService,
    private grnService: PurchaseGoodreceiptService,
    private router: Router
  ) {
    const today = new Date();
    this.advanceDate = today.toISOString().substring(0, 10);
  }

  ngOnInit(): void {
    this.loadSuppliers();
    this.loadBankAccounts();
    this.loadGrns();
  }

  // =================== lookups ===================
  loadSuppliers(): void {
    this.supplierSvc.GetAllSupplier().subscribe({
      next: (res: any) => {
        const raw = res?.data || res || [];
        this.suppliers = (raw || []).map((s: any) => ({
          id: s.id || s.Id,
          name: s.name || s.supplierName || s.SupplierName
        }));
      },
      error: () => {
        Swal.fire('Error', 'Failed to load suppliers', 'error');
      }
    });
  }

  loadBankAccounts(): void {
    this.apSvc.getBankAccounts().subscribe({
      next: (res: any) => {
        this.bankAccounts = res?.data || res || [];
      },
      error: () => {
        // non-blocking
        this.bankAccounts = [];
      }
    });
  }

  loadGrns(): void {
    this.grnService.getAllGRN().subscribe({
      next: (res: any) => {
        const raw = res?.data ?? [];
        this.grnList = raw.map((x: any) => ({
          id: x.id,
          grnNo: x.grnNo,
          poid: x.poid,
          poNo: x.poNo,
          tax: x.tax,
          supplierId: x.supplierId,
          supplierName: x.supplierName,
          grnJson: x.grnJson,
          poLines: x.poLines,
          currencyId: x.currencyId
        }));

        // by default show all (or filter by supplier later)
        this.applyGrnSupplierFilter();
      },
      error: (err: any) => console.error('Error loading GRN list', err)
    });
  }

  // =================== UI helpers ===================
  getMethodName(id: number): string {
    switch (id) {
      case 1: return 'Cash';
      case 2: return 'Bank Transfer';
      case 3: return 'Cheque';
      case 4: return 'Other';
      default: return 'Other';
    }
  }

  onSupplierChange(): void {
    const sup = this.suppliers.find(s => s.id === this.supplierId!);
    this.supplierName = sup?.name || null;

    // Filter GRNs to selected supplier if available
    this.applyGrnSupplierFilter();

    // If current GRN belongs to other supplier, clear it
    if (this.grnId != null) {
      const grn = this.grnList.find(g => g.id === this.grnId);
      if (grn && this.supplierId && grn.supplierId !== this.supplierId) {
        this.grnId = null;
        this.grnNo = '';
        this.grnSearch = '';
      }
    }
  }

  private applyGrnSupplierFilter(): void {
    if (this.supplierId) {
      this.grnFiltered = this.grnList.filter(g => g.supplierId === this.supplierId);
    } else {
      this.grnFiltered = [...this.grnList];
    }
  }

  onDateChange(): void {
    // if you want, you can validate period lock from AP service here
  }

  onAmountChange(): void {
    this.recalcBankBalanceAfterAdvance();
  }

  onMethodChange(): void {
    if (this.methodId === 2 || this.methodId === 3) {
      this.onBankChange();
    } else {
      this.bankHeadId = null;
      this.bankAvailableBalance = null;
      this.bankBalanceAfterAdvance = null;
      this.bankName = null;
    }
  }

  onBankChange(): void {
    const bank = this.bankAccounts.find(x => x.id === this.bankHeadId);
    this.bankAvailableBalance = bank?.availableBalance || bank?.AvailableBalance || null;
    this.bankName = bank?.headName || bank?.HeadName || null;
    this.recalcBankBalanceAfterAdvance();
  }

  recalcBankBalanceAfterAdvance(): void {
    if (this.bankAvailableBalance == null) {
      this.bankBalanceAfterAdvance = null;
      return;
    }
    const amt = Number(this.amount || 0);
    this.bankBalanceAfterAdvance = this.bankAvailableBalance - amt;
  }

  // =================== GRN combobox logic ===================
  trackByGrn = (_: number, g: GRNHeader) => g.id;

  onGrnFocus(): void {
    // when focus, show list (already filtered by supplier)
    this.applyGrnSupplierFilter();
    this.grnOpen = true;
  }

  onGrnSearch(e: any): void {
    const q = (e.target.value || '').toLowerCase();
    this.grnSearch = e.target.value || '';

    this.applyGrnSupplierFilter();
    if (q) {
      this.grnFiltered = this.grnFiltered.filter(g =>
        g.grnNo.toLowerCase().includes(q) ||
        (g.poNo || '').toString().toLowerCase().includes(q) ||
        (g.supplierName || '').toLowerCase().includes(q)
      );
    }

    this.grnOpen = true;
  }

  toggleGrnDropdown(ev: MouseEvent): void {
    ev.stopPropagation();
    this.grnOpen = !this.grnOpen;
    if (this.grnOpen) {
      this.applyGrnSupplierFilter();
    }
  }

  selectGrn(g: GRNHeader): void {
    this.grnId = g.id;
    this.grnNo = g.grnNo;
    this.grnSearch = g.grnNo;
    this.grnOpen = false;

    // If supplier not selected, auto pick from GRN supplier
    if (!this.supplierId && g.supplierId) {
      this.supplierId = g.supplierId;
      this.onSupplierChange();
    }
  }

  // Close GRN dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement;
    if (!target.closest('.grn-combobox')) {
      this.grnOpen = false;
    }
  }

  // =================== validation ===================
  canSave(): boolean {
    if (!this.supplierId) return false;
    if (!this.advanceDate) return false;
    if (!this.amount || this.amount <= 0) return false;

    if ((this.methodId === 2 || this.methodId === 3) && !this.bankHeadId) {
      return false;
    }
    return true;
  }

  // =================== actions ===================
  saveAdvance(): void {
    if (!this.canSave()) {
      Swal.fire('Warning', 'Fill mandatory fields before saving', 'warning');
      return;
    }

    this.saving = true;

    const payload: any = {
      supplierId: this.supplierId,
      advanceDate: this.advanceDate,
      amount: this.amount,
      referenceNo: this.referenceNo || null,
      notes: this.notes || null,
      methodId: this.methodId,
      bankHeadId: this.bankHeadId,
      grnId: this.grnId,
      grnNo: this.grnNo || null
    };

    this.apSvc.createSupplierAdvance(payload).subscribe({
      next: (res: any) => {
        this.saving = false;

        if (res?.isSuccess === false) {
          Swal.fire('Error', res.message || 'Failed to save advance', 'error');
          return;
        }

        Swal.fire('Success', 'Supplier advance created', 'success').then(() => {
          this.goBack();
        });
      },
      error: err => {
        this.saving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save advance';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/financial/AccountPayable']);
  }
}
