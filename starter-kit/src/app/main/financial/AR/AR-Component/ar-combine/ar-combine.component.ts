import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsPayableService } from 'app/main/financial/accounts-payable/accounts-payable.service';

type ArTab = 'invoices' | 'receipts' | 'advance' | 'aging';

interface ArAdvanceListRow {
  id: number;
  customerId: number;
  customerName: string;
  advanceNo: string;
  advanceDate: string | Date;
  salesOrderId?: number | null;
  salesOrderNo?: string | null;
  amount: number;
  balanceAmount: number;
  paymentMode: string;
  bankAccountId?: number | null;
  bankName?: string | null;
  remarks?: string | null;
}

@Component({
  selector: 'app-ar-combine',
  templateUrl: './ar-combine.component.html',
  styleUrls: ['./ar-combine.component.scss']
})
export class ARCombineComponent implements OnInit {

  activeTab: ArTab = 'invoices';

  // ========= ADVANCE LIST STATE =========
  arAdvances: ArAdvanceListRow[] = [];
  pagedArAdvances: ArAdvanceListRow[] = [];

  arTotalAdvanceAmount = 0;
  arTotalAdvanceBalance = 0;

  arAdvPage = 1;
  arAdvPageSize = 20;
  arAdvTotalPages = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private arService: AccountsPayableService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab') as ArTab | null;
      if (tab) {
        this.activeTab = tab;
        if (tab === 'advance') {
          this.loadArAdvances();
        }
      }
    });

    // Default load if initial tab is 'advance'
    if (this.activeTab === 'advance') {
      this.loadArAdvances();
    }
  }

  setTab(tab: ArTab): void {
    this.activeTab = tab;

    if (tab === 'advance') {
      this.loadArAdvances();
    }
  }

  // ================== ADVANCE LIST – LOAD & PAGING ==================

  loadArAdvances(): void {
    this.arService.getSupplierAdvancesList().subscribe({
      next: (res: any) => {
        const raw = res?.data || res || [];

        this.arAdvances = (raw as any[]).map(x => ({
          id: x.id,
          customerId: x.customerId,
          customerName: x.customerName || '',
          advanceNo: x.advanceNo,
          advanceDate: x.advanceDate,
          salesOrderId: x.salesOrderId,
          salesOrderNo: x.salesOrderNo,
          amount: Number(x.amount || 0),
          balanceAmount: Number(x.balanceAmount || 0),
          paymentMode: x.paymentMode,
          bankAccountId: x.bankAccountId,
          bankName: x.bankName,
          remarks: x.remarks
        }));

        // totals
        this.arTotalAdvanceAmount = 0;
        this.arTotalAdvanceBalance = 0;
        this.arAdvances.forEach(r => {
          this.arTotalAdvanceAmount += r.amount;
          this.arTotalAdvanceBalance += r.balanceAmount;
        });

        this.arAdvPage = 1;
        this.recalcArAdvPaging();
      },
      error: err => {
        console.error('Failed to load customer advances', err);
        this.arAdvances = [];
        this.pagedArAdvances = [];
        this.arTotalAdvanceAmount = 0;
        this.arTotalAdvanceBalance = 0;
      }
    });
  }

  recalcArAdvPaging(): void {
    const total = this.arAdvances.length || 0;
    this.arAdvTotalPages = Math.max(1, Math.ceil(total / this.arAdvPageSize));
    this.applyArAdvPage();
  }

  applyArAdvPage(): void {
    const start = (this.arAdvPage - 1) * this.arAdvPageSize;
    this.pagedArAdvances = this.arAdvances.slice(start, start + this.arAdvPageSize);
  }

  arAdvGoToPage(p: number): void {
    if (p < 1 || p > this.arAdvTotalPages) return;
    this.arAdvPage = p;
    this.applyArAdvPage();
  }

  // ================== NAVIGATION ==================

  goToNewAdvance(): void {
    // Your AR advance create screen route
    this.router.navigate(['/financial/ar-advance']);
  }
}
