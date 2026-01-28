import { Component, OnInit } from '@angular/core';
import {
  ArInvoiceListItem,
  ArInvoiceService,
  ArCustomerGroup
} from '../invoice-service';
import { Router } from '@angular/router';
import feather from 'feather-icons';

@Component({
  selector: 'app-invoice-create',
  templateUrl: './invoice-create.component.html',
  styleUrls: ['./invoice-create.component.scss']
})
export class InvoiceCreateComponent implements OnInit {
  // groups by customer
  groups: ArCustomerGroup[] = [];
  filteredGroups: ArCustomerGroup[] = [];

  searchTerm = '';
  loading = false;

  // header totals
  totalInvoiceAmount = 0;
  totalPaid = 0;
  totalCreditNote = 0;
  netOutstanding = 0;

  constructor(private arService: ArInvoiceService, private router: Router  ) { }

  ngOnInit(): void {
    this.loadInvoices();
  }
  ngAfterViewInit() {
    feather.replace();
}


  loadInvoices(): void {
    debugger
    this.loading = true;
    this.arService.getInvoices().subscribe({
      next: data => {
        this.buildGroups(data);
        this.computeHeaderTotals();
        this.filteredGroups = [...this.groups];
        this.loading = false;
      },
      error: _ => {
        this.loading = false;
      }
    });
  }
private buildGroups(rows: ArInvoiceListItem[]): void {
  const map = new Map<number, ArCustomerGroup>();

  for (const r of rows) {
    if (!map.has(r.customerId)) {
      map.set(r.customerId, {
        customerId: r.customerId,
        customerName: r.customerName,
        invoiceCount: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalCreditNote: 0,
        totalOutstanding: 0,
        netOutstanding: 0,
        invoices: [],
        creditNotes: [],
        expanded: false,
        creditNoteNo: undefined,
        creditNoteDate: undefined,
        creditNoteStatus: undefined
      });
    }

    const g = map.get(r.customerId)!;

    if (r.rowType === 'CN') {
      // standalone credit-note display row
      g.creditNotes.push(r);

      // total CN for display (always +ve)
      g.totalCreditNote += Math.abs(r.customerCreditNoteAmount || r.amount || 0);
    }
    else {
      // normal invoice row
      g.invoices.push(r);
      g.totalAmount      += r.amount || 0;
      g.totalPaid        += r.paid || 0;
      g.totalOutstanding += r.outstanding || 0;
    }
  }

  this.groups = Array.from(map.values()).map(g => {
    g.invoiceCount = g.invoices.length;

    // unapplied CN = CN rows with NO invoiceId
    const unappliedCn = g.creditNotes
      .filter(cn => !cn.invoiceId || cn.invoiceId <= 0)
      .reduce((sum, cn) => sum + Math.abs(cn.customerCreditNoteAmount || cn.amount || 0), 0);

    // net outstanding = invoices outstanding – **unapplied** credits
    g.netOutstanding = g.totalOutstanding - unappliedCn;

    return g;
  });
}



 private computeHeaderTotals(): void {
  this.totalInvoiceAmount = 0;
  this.totalPaid = 0;
  this.totalCreditNote = 0;
  this.netOutstanding = 0;

  for (const g of this.groups) {
    this.totalInvoiceAmount += g.totalAmount;
    this.totalPaid          += g.totalPaid;
    this.totalCreditNote    += g.totalCreditNote;
    this.netOutstanding     += g.netOutstanding;   // << use net, not totalOutstanding
  }
}


  onSearchChange(term: string): void {
    this.searchTerm = term || '';
    const t = this.searchTerm.toLowerCase();

    if (!t) {
      this.filteredGroups = [...this.groups];
      return;
    }

    this.filteredGroups = this.groups.filter(g =>
      (g.customerName || '').toLowerCase().includes(t)
    );
  }

  toggleExpand(group: ArCustomerGroup): void {
    group.expanded = !group.expanded;
  }

  getInvoiceStatus(row: ArInvoiceListItem): string {
    if ((row.outstanding || 0) === 0) {
      return 'Paid';
    }
    if ((row.paid || 0) > 0 || (row.creditNote || 0) > 0) {
      return 'Partial';
    }
    return 'Unpaid';
  }

  getStatusClassFromString(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return 'status-pill status-paid';
    if (s === 'partial') return 'status-pill status-partial';
    if (s === 'unpaid') return 'status-pill status-unpaid';
    return 'status-pill';
  }

  printInvoice(row: ArInvoiceListItem): void {
    // TODO: hook to your SI print
    // this.router.navigate(['/sales/sales-invoice-print', row.invoiceId]);
  }
    openCreditNote(cn: ArInvoiceListItem): void {
      debugger
    const cnNo = cn.customerCreditNoteNo || cn.invoiceNo;
    if (!cnNo) { return; }

    this.router.navigate(
      ['/Sales/Return-credit-list'],
      { queryParams: { cn: cnNo } }   // e.g. ?cn=CN-000002
    );
  }
}
