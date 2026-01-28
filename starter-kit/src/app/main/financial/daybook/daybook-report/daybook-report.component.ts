import { AfterViewInit, Component, OnInit } from '@angular/core';
import feather from 'feather-icons';
import {
  DaybookRequestDto,
  DaybookResponseDto,
  DaybookService
} from '../daybook-service/daybook.service';
import { Router } from '@angular/router';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// For display label
type DaybookType =
  | 'Journal'
  | 'Bank Receipt'
  | 'Bank Payment'
  | 'Sales Invoice'
  | 'Credit Note'
  | 'Customer Receipt'
  | 'Supplier Invoice'
  | 'Supplier Payment'
  | 'Supplier Debit Note'
  | string;

interface DaybookVoucher {
  date: Date;
  voucherNo: string;
  type: DaybookType;
  typeClass?: string;          // css class for badge
  account: string;
  debit?: number;
  credit?: number;
  runningBalance: number;
}

interface DaybookSummaryRow {
  label: string;
  totalDebit: number;
  totalCredit: number;
  netAbs: number;
  netType: 'Dr' | 'Cr';
}

@Component({
  selector: 'app-daybook-report',
  templateUrl: './daybook-report.component.html',
  styleUrls: ['./daybook-report.component.scss']
})
export class DaybookReportComponent implements OnInit, AfterViewInit {

  vouchers: DaybookVoucher[] = [];
  summaryRows: DaybookSummaryRow[] = [];

  totalDebit = 0;
  totalCredit = 0;
  netMovement = 0;
  netMovementAbs = 0;
  netMovementType: 'Dr' | 'Cr' = 'Dr';

  viewMode: 'detailed' | 'summary' = 'detailed';

  // modal + loading (date filter)
  isFilterModalOpen = true;   // open on route load
  loading = false;
  filter = {
    fromDate: '',
    toDate: ''
  };

  // export modal
  showExportModal = false;
  exportFileName = '';

  constructor(
    private daybookService: DaybookService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // wait for filter submit
  }

  ngAfterViewInit(): void {
    setTimeout(() => feather.replace());
  }

  // =========================================================
  //  EXPORT MODAL
  // =========================================================
  openExportModal(): void {
    if (!this.vouchers.length) {
      return;
    }
    this.exportFileName = this.generateDefaultFilename();
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  private generateDefaultFilename(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');

    const stamp =
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());

    return `daybook-${stamp}`;
  }

  confirmExport(format: 'excel' | 'pdf'): void {
    if (!this.vouchers.length) {
      return;
    }

    const baseName =
      (this.exportFileName || this.generateDefaultFilename()).trim();

    if (format === 'excel') {
      this.exportToExcel(`${baseName}.xlsx`);
    } else {
      // PDF – choose layout based on current tab
      if (this.viewMode === 'detailed') {
        this.exportDetailedPdf(`${baseName}.pdf`);
      } else {
        this.exportSummaryPdf(`${baseName}.pdf`);
      }
    }

    this.closeExportModal();
  }

  // =========================================================
  //  API CALL
  // =========================================================
  private loadDaybook(): void {
    const payload: DaybookRequestDto = {
      fromDate: this.filter.fromDate,
      toDate: this.filter.toDate
      // companyId: 1
    };

    this.loading = true;
    this.vouchers = [];
    this.summaryRows = [];

    this.daybookService.getDaybook(payload).subscribe({
      next: (res) => {
        const rows: DaybookResponseDto[] = res.data ?? [];

        this.vouchers = rows.map(r => this.mapApiToVoucher(r));
        this.calculateTotals();
        this.loading = false;
        this.isFilterModalOpen = false;

        setTimeout(() => feather.replace());
      },
      error: (err) => {
        console.error('Daybook load error', err);
        this.loading = false;
      }
    });
  }

  private mapApiToVoucher(r: DaybookResponseDto): DaybookVoucher {
    let typeClass = '';
    let type: DaybookType;

    switch (r.voucherType) {
      case 'MJ':
        type = 'Journal';
        typeClass = 'db-type-journal';
        break;

      case 'AR-RCPT':
      case 'ARREC':
        type = 'Customer Receipt';
        typeClass = 'db-type-receipt';
        break;

      case 'SI':
      case 'ARINV':
        type = 'Sales Invoice';
        typeClass = 'db-type-sales';
        break;

      case 'CN':
      case 'ARCN':
        type = 'Credit Note';
        typeClass = 'db-type-cn';
        break;

      case 'PIN':
        type = 'Supplier Invoice';
        typeClass = 'db-type-pin';
        break;

      case 'SPAY':
      case 'SP-AP':
        type = 'Supplier Payment';
        typeClass = 'db-type-payment';
        break;

      case 'SDN':
      case 'DN-AP':
        type = 'Supplier Debit Note';
        typeClass = 'db-type-sdn';
        break;

      default:
        type = r.voucherType;
        typeClass = 'db-type-journal';
        break;
    }

    return {
      date: new Date(r.transDate),
      voucherNo: r.voucherNo,
      type,
      typeClass,
      account: r.accountHeadName,
      debit: r.debit || undefined,
      credit: r.credit || undefined,
      runningBalance: r.runningBalance
    };
  }

  // =========================================================
  //  TOTALS + SUMMARY
  // =========================================================
  private calculateTotals(): void {
    this.totalDebit = this.vouchers.reduce((sum, v) => sum + (v.debit || 0), 0);
    this.totalCredit = this.vouchers.reduce((sum, v) => sum + (v.credit || 0), 0);

    this.netMovement = this.totalDebit - this.totalCredit;
    this.netMovementAbs = Math.abs(this.netMovement);
    this.netMovementType = this.netMovement >= 0 ? 'Dr' : 'Cr';

    // ---- build summary by type for SUMMARY VIEW ----
    const temp: { [label: string]: { totalDebit: number; totalCredit: number } } = {};

    for (const v of this.vouchers) {
      const key = v.type || 'Others';
      if (!temp[key]) {
        temp[key] = { totalDebit: 0, totalCredit: 0 };
      }
      temp[key].totalDebit += v.debit || 0;
      temp[key].totalCredit += v.credit || 0;
    }

    this.summaryRows = Object.keys(temp).map(label => {
      const d = temp[label].totalDebit;
      const c = temp[label].totalCredit;
      const net = d - c;
      return {
        label,
        totalDebit: d,
        totalCredit: c,
        netAbs: Math.abs(net),
        netType: net >= 0 ? 'Dr' : 'Cr'
      };
    });
  }

  // =========================================================
  //  VIEW & PRINT
  // =========================================================
  setViewMode(mode: 'detailed' | 'summary'): void {
    this.viewMode = mode;
  }

  onPrintDaybook(): void {
    window.print();
  }

  // =========================================================
  //  MODAL EVENTS (DATE FILTER)
  // =========================================================
  onApplyFilter(): void {
    if (!this.filter.fromDate || !this.filter.toDate) {
      return;
    }
    this.loadDaybook();
  }

  onCancelFilter(): void {
    this.isFilterModalOpen = false;
    this.router.navigate(['financial/finance-report']);
  }

  openFilterAgain(): void {
    this.isFilterModalOpen = true;
  }

  // =========================================================
  //  EXPORT FUNCTIONS
  // =========================================================

  // Excel (always detailed rows)
  private exportToExcel(fileName: string): void {
    if (!this.vouchers.length) {
      return;
    }

    const exportData = this.vouchers.map(v => ({
      Date: v.date.toISOString().substring(0, 10),
      'Voucher No': v.voucherNo,
      Type: v.type,
      Account: v.account,
      Debit: v.debit || 0,
      Credit: v.credit || 0,
      'Running Balance': v.runningBalance
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daybook');

    XLSX.writeFile(wb, fileName);
  }

  // ========= PDF – DETAILED (TABLE VIEW) =========
  private exportDetailedPdf(fileName: string): void {
    if (!this.vouchers.length) {
      return;
    }

    const doc = new jsPDF('l', 'pt', 'a4');

    const body = this.vouchers.map(v => [
      v.date.toISOString().substring(0, 10),
      v.voucherNo,
      v.type,
      v.account,
      (v.debit || 0).toFixed(2),
      (v.credit || 0).toFixed(2),
      v.runningBalance.toFixed(2)
    ]);

    autoTable(doc, {
      head: [[
        'Date',
        'Voucher No',
        'Type',
        'Account',
        'Debit',
        'Credit',
        'Running Balance'
      ]],
      body,
      startY: 40,
      styles: { fontSize: 8 }
    });

    doc.text('Daybook – Detailed View', 40, 25);
    doc.save(fileName);
  }

  // ========= PDF – SUMMARY (CARD VIEW STYLE) =========
  private exportSummaryPdf(fileName: string): void {
    if (!this.vouchers.length) {
      return;
    }

    // ensure summaryRows is ready
    if (!this.summaryRows || !this.summaryRows.length) {
      this.calculateTotals();
    }

    const doc = new jsPDF('p', 'pt', 'a4');

    doc.setFontSize(14);
    doc.text('Daybook Summary', 40, 40);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text('Showing totals by voucher type for the selected period.', 40, 58);
    doc.setTextColor(0);
    doc.setFontSize(8);

    const body = this.summaryRows.map(row => [
      row.label,
      row.totalDebit.toFixed(2),
      row.totalCredit.toFixed(2),
      `${row.netAbs.toFixed(2)} ${row.netType}`
    ]);

    autoTable(doc, {
      head: [[
        'Voucher Type',
        'Total Debit',
        'Total Credit',
        'Net (Dr/Cr)'
      ]],
      body,
      startY: 75,
      styles: { fontSize: 8 }
    });

    doc.save(fileName);
  }
}
