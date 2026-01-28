import { Component, OnInit } from '@angular/core';
import { ReportsService } from './report-service';
import { TrialBalance } from '../trial-balance-model';
import feather from 'feather-icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface TbNode extends TrialBalance {
  parentHead: number | null;
  level: number;
  expanded: boolean;
  isLeaf: boolean;
  children: TbNode[];

  // opening edit support
  isEditingOpening?: boolean;
  openingDebitEdit?: number | null;
  openingCreditEdit?: number | null;
}

@Component({
  selector: 'app-trial-balance-report',
  templateUrl: './trial-balance-report.component.html',
  styleUrls: ['./trial-balance-report.component.scss']
})
export class TrialBalanceReportComponent implements OnInit {

  fromDate: string | null = null;
  toDate: string | null = null;
  companyId: number | null = 1;

  // for Show entries + Search
  selectedOption = 25;          // default page size
  searchValue = '';

  // raw rows from API (for debugging)
  rawRows: any[] = [];

  // tree + flattened list for display
  roots: TbNode[] = [];
  displayRows: TbNode[] = [];

  // totals (only leaf accounts)
  totalOpeningDebit = 0;
  totalOpeningCredit = 0;
  totalClosingDebit = 0;
  totalClosingCredit = 0;

  isLoading = false;

  // detail
  selectedHead: TbNode | null = null;
  detailRows: any[] = [];
  detailLoading = false;
  userName: string;
  pageSize = 10;
  currentPage = 1;
  totalRows = 0;

  constructor(private reportsService: ReportsService) { }

  ngOnInit(): void { }

  ngAfterViewInit() {
    feather.replace();
  }

  // ================== RUN TB ==================
  runTB(): void {
    const body = {
      fromDate: this.fromDate,
      toDate: this.toDate,
      companyId: this.companyId
    };

    this.isLoading = true;
    this.selectedHead = null;
    this.detailRows = [];
    this.currentPage = 1;

    this.reportsService.getTrialBalance(body).subscribe({
      next: (res: any) => {
        this.rawRows = res.data || [];

        const mapByCode = new Map<string, TbNode>();

        this.rawRows.forEach((r: any) => {
          const node: TbNode = {
            ...r,
            parentHead: r.parentHead ?? null,
            level: 0,
            expanded: false,
            isLeaf: true,
            children: [],
            isEditingOpening: false,
            openingDebitEdit: r.openingDebit,
            openingCreditEdit: r.openingCredit
          };
          mapByCode.set(String(node.headCode), node);
        });

        const roots: TbNode[] = [];

        mapByCode.forEach(node => {
          const parentCode =
            node.parentHead !== null && node.parentHead !== 0
              ? String(node.parentHead)
              : '';

          if (parentCode && mapByCode.has(parentCode)) {
            const parent = mapByCode.get(parentCode)!;
            parent.children.push(node);
            parent.isLeaf = false;
            node.level = parent.level + 1;
          } else {
            roots.push(node);
          }
        });

        mapByCode.forEach(n => {
          if (n.children?.length) {
            n.children.sort((a, b) => a.headCode.localeCompare(b.headCode));
          }
        });
        roots.sort((a, b) => a.headCode.localeCompare(b.headCode));

        this.roots = roots;

        this.roots.forEach(r => this.recalcTotalsRecursive(r));

        this.roots.forEach(r => (r.expanded = false));
        this.rebuildDisplayRows();

        const leafNodes: TbNode[] = [];
        this.collectLeaves(this.roots, leafNodes);

        this.totalOpeningDebit = leafNodes.reduce(
          (s, n) => s + (n.openingDebit || 0),
          0
        );
        this.totalOpeningCredit = leafNodes.reduce(
          (s, n) => s + (n.openingCredit || 0),
          0
        );
        this.totalClosingDebit = leafNodes.reduce(
          (s, n) => s + (n.closingDebit || 0),
          0
        );
        this.totalClosingCredit = leafNodes.reduce(
          (s, n) => s + (n.closingCredit || 0),
          0
        );

        this.isLoading = false;
      },
      error: () => {
        this.roots = [];
        this.displayRows = [];
        this.totalOpeningDebit =
          this.totalOpeningCredit =
          this.totalClosingDebit =
          this.totalClosingCredit =
          0;
        this.isLoading = false;
      }
    });
  }

  // -------- recursion / totals (unchanged) --------
  private recalcTotalsRecursive(node: TbNode): void {
    const ownOD = node.openingDebit || 0;
    const ownOC = node.openingCredit || 0;
    const ownCD = node.closingDebit || 0;
    const ownCC = node.closingCredit || 0;

    if (!node.children.length) {
      node.openingDebit = ownOD;
      node.openingCredit = ownOC;
      node.closingDebit = ownCD;
      node.closingCredit = ownCC;
      return;
    }

    node.children.forEach(c => this.recalcTotalsRecursive(c));

    const childrenOD = node.children.reduce((s, n) => s + (n.openingDebit || 0), 0);
    const childrenOC = node.children.reduce((s, n) => s + (n.openingCredit || 0), 0);
    const childrenCD = node.children.reduce((s, n) => s + (n.closingDebit || 0), 0);
    const childrenCC = node.children.reduce((s, n) => s + (n.closingCredit || 0), 0);

    node.openingDebit = ownOD + childrenOD;
    node.openingCredit = ownOC + childrenOC;
    node.closingDebit = ownCD + childrenCD;
    node.closingCredit = ownCC + childrenCC;
  }

  private collectLeaves(nodes: TbNode[], bucket: TbNode[]): void {
    nodes.forEach(n => {
      if (n.children.length === 0) {
        bucket.push(n);
      } else {
        this.collectLeaves(n.children, bucket);
      }
    });
  }

  private refreshFeatherIcons(): void {
    setTimeout(() => feather.replace(), 0);
  }

  // ================= FLATTEN + FILTER + PAGINATE =================
  rebuildDisplayRows(): void {
    const flat: TbNode[] = [];

    const visit = (n: TbNode) => {
      flat.push(n);
      if (n.expanded && n.children.length) {
        n.children.forEach(c => visit(c));
      }
    };

    this.roots.forEach(r => visit(r));

    // ---------- SEARCH FILTER ----------
    const term = (this.searchValue || '').toLowerCase();
    let filtered = flat;

    if (term) {
      filtered = flat.filter(n =>
        String(n.headCode).includes(term) ||
        (n.headName || '').toLowerCase().includes(term)
      );
    }

    // ---------- PAGINATION ----------
    this.totalRows = filtered.length;
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.displayRows = filtered.slice(start, end);

    this.refreshFeatherIcons();
  }


  filterUpdate(): void {
    this.currentPage = 1;
    this.rebuildDisplayRows();
  }

  // ============= DISPLAY HELPERS (parent expanded => 0) =============
  private isHeadingExpanded(node: TbNode): boolean {
    return !!(node.children && node.children.length && node.expanded);
  }

  getOpeningDebitDisplay(node: TbNode): number {
    return this.isHeadingExpanded(node) ? 0 : (node.openingDebit || 0);
  }

  getOpeningCreditDisplay(node: TbNode): number {
    return this.isHeadingExpanded(node) ? 0 : (node.openingCredit || 0);
  }

  getClosingDebitDisplay(node: TbNode): number {
    return this.isHeadingExpanded(node) ? 0 : (node.closingDebit || 0);
  }

  getClosingCreditDisplay(node: TbNode): number {
    return this.isHeadingExpanded(node) ? 0 : (node.closingCredit || 0);
  }

  toggleNode(node: TbNode, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (!node.children.length) {
      return;
    }
    node.expanded = !node.expanded;
    this.rebuildDisplayRows();
  }

  // ================== DETAIL ==================
  onRowClick(row: TbNode): void {
    if (!row.isLeaf && row.children.length) {
      return;
    }

    if (this.selectedHead && this.selectedHead.headId === row.headId) {
      this.selectedHead = null;
      this.detailRows = [];
      return;
    }

    this.selectedHead = row;
    this.loadDetail(row);
  }

  private loadDetail(row: TbNode): void {
    this.detailLoading = true;

    const body = {
      headId: row.headId,
      fromDate: this.fromDate,
      toDate: this.toDate,
      companyId: this.companyId
    };

    this.reportsService.getTrialBalanceDetail(body).subscribe({
      next: (res: any) => {
        this.detailRows = res.data || [];
        this.detailLoading = false;
      },
      error: () => {
        this.detailRows = [];
        this.detailLoading = false;
      }
    });
  }

  // opening edit methods (unchanged)
  startEditOpening(node: TbNode, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (!node.isLeaf) return;

    node.isEditingOpening = true;
    node.openingDebitEdit = node.openingDebit || 0;
    node.openingCreditEdit = node.openingCredit || 0;

    this.refreshFeatherIcons();
  }

  cancelEditOpening(node: TbNode, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    node.isEditingOpening = false;
    node.openingDebitEdit = node.openingDebit || 0;
    node.openingCreditEdit = node.openingCredit || 0;

    this.refreshFeatherIcons();
  }

  saveOpening(node: TbNode, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.userName = localStorage.getItem('username') || '';

    const body = {
      headId: node.headId,
      companyId: this.companyId,
      openingDebit: node.openingDebitEdit || 0,
      openingCredit: node.openingCreditEdit || 0,
      asOfDate: this.fromDate,
      username: this.userName
    };

    this.reportsService.saveOpeningBalance(body).subscribe({
      next: () => {
        node.openingDebit = body.openingDebit;
        node.openingCredit = body.openingCredit;
        node.isEditingOpening = false;

        this.roots.forEach(r => this.recalcTotalsRecursive(r));
        this.rebuildDisplayRows();
      },
      error: () => {
        // handle error toast if needed
      }
    });
  }
  changePage(page: number): void {
    const maxPage = this.totalPages;
    if (page < 1 || page > maxPage) {
      return;
    }
    this.currentPage = page;
    this.rebuildDisplayRows();
  }

  get totalPages(): number {
    if (!this.pageSize) return 1;
    const pages = Math.ceil(this.totalRows / this.pageSize);
    return pages > 0 ? pages : 1;
  }

  // simple [1..N] list; you can later make it windowed if needed
  get pages(): number[] {
    const arr: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      arr.push(i);
    }
    return arr;
  }

  get startIndex(): number {
    if (this.totalRows === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    if (this.totalRows === 0) return 0;
    const end = this.currentPage * this.pageSize;
    return end > this.totalRows ? this.totalRows : end;
  }

  private buildTbExportRows(): any[] {
    // 1) take only leaf nodes
    const leaves: TbNode[] = [];
    this.collectLeaves(this.roots, leaves);

    // 2) keep only rows where any value > 0
    const valueRows = leaves.filter(n => {
      const od = this.getOpeningDebitDisplay(n) || 0;
      const oc = this.getOpeningCreditDisplay(n) || 0;
      const cd = this.getClosingDebitDisplay(n) || 0;
      const cc = this.getClosingCreditDisplay(n) || 0;
      return od !== 0 || oc !== 0 || cd !== 0 || cc !== 0;
    });

    // 3) map to export format
    const rows: any[] = valueRows.map((n, idx) => ({
      'Sl. No': idx + 1,
      'Head Code': n.headCode,
      'Head Name': n.headName,
      'Opening Debit': this.getOpeningDebitDisplay(n),
      'Opening Credit': this.getOpeningCreditDisplay(n),
      'Closing Debit': this.getClosingDebitDisplay(n),
      'Closing Credit': this.getClosingCreditDisplay(n)
    }));

    // 4) add TOTAL row (always show)
    rows.push({
      'Sl. No': '',
      'Head Code': '',
      'Head Name': 'Total',
      'Opening Debit': this.totalOpeningDebit,
      'Opening Credit': this.totalOpeningCredit,
      'Closing Debit': this.totalClosingDebit,
      'Closing Credit': this.totalClosingCredit
    });

    return rows;
  }



  exportToExcel(): void {
    const data = this.buildTbExportRows();
    if (!data.length) { return; }

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');

    const from = this.fromDate || 'all';
    const to = this.toDate || 'all';
    const fileName = `Trial-Balance-${from}-to-${to}.xlsx`;

    XLSX.writeFile(wb, fileName);
  }

  exportToPdf(): void {
    const data = this.buildTbExportRows();   // already filtered > 0
    if (!data.length) { return; }

    const doc = new jsPDF('l', 'pt', 'a4'); // landscape
    const pageWidth = doc.internal.pageSize.getWidth();

    const from = this.fromDate || 'All';
    const to = this.toDate || 'All';
    const title = `Trial Balance (${from} to ${to})`;

    doc.setFontSize(12);
    doc.text(title, pageWidth / 2, 30, { align: 'center' });

    const head = [[
      'Sl. No',
      'Head Code',
      'Head Name',
      'Opening Debit',
      'Opening Credit',
      'Closing Debit',
      'Closing Credit'
    ]];

    const body = data.map(r => [
      r['Sl. No'].toString(),
      r['Head Code'].toString(),
      r['Head Name'],
      (r['Opening Debit'] || 0).toFixed(2),
      (r['Opening Credit'] || 0).toFixed(2),
      (r['Closing Debit'] || 0).toFixed(2),
      (r['Closing Credit'] || 0).toFixed(2)
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 45,
      margin: { left: 40, right: 40 },
      styles: {
        fontSize: 9,
        halign: 'right',
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'center' }, // Sl. No
        1: { halign: 'left' },   // Head Code
        2: { halign: 'left' },   // Head Name
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' }
      },
      headStyles: {
        halign: 'left'
      }
    });

    const fileName = `Trial-Balance-${from}-to-${to}.pdf`;
    doc.save(fileName);
  }


}
