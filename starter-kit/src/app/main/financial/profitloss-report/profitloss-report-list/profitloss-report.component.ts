import { Component, OnInit, AfterViewInit } from '@angular/core';
import feather from 'feather-icons';
import { ProfitlossService } from '../profitloss-service/profitloss.service';

@Component({
  selector: 'app-profitloss-report',
  templateUrl: './profitloss-report.component.html',
  styleUrls: ['./profitloss-report.component.scss']
})
export class ProfitlossReportComponent implements OnInit, AfterViewInit {

  headerTitle = 'Profit & Loss';

  ProfitlossList: any[] = [];

  // Base rows (without Net Profit / Net Loss)
  private purchaseBase: any[] = [];
  private salesBase: any[] = [];

  // Rows actually displayed in UI (include Net Profit / Net Loss line)
  purchaseRows: any[] = [];
  salesRows: any[] = [];

  // Summary numbers
  totalExpense = 0;   // = base purchase total (no net row)
  totalSales   = 0;   // = base sales total (no net row)
  netProfit    = 0;   // sales - purchase

  // Column grand totals (bottom “Total” rows)
  leftGrandTotal  = 0;   // Purchase column final total
  rightGrandTotal = 0;   // Sales column final total

  constructor(private _profitlossService: ProfitlossService) {}

  ngOnInit(): void {
    this.loadProfitlossDetails();
  }

  ngAfterViewInit(): void {
    setTimeout(() => feather.replace());
  }

  // =====================================================
  // API CALL & MAPPING
  // =====================================================
  loadProfitlossDetails() {
    this._profitlossService.GetProfitLossDetails().subscribe((res: any) => {
      this.ProfitlossList = res?.data || [];

      // ----- LEFT: Purchase Accounts (hide 0.00) -----
      this.purchaseBase = this.ProfitlossList
        .filter((x: any) =>
          x.purchase !== null &&
          x.purchase !== undefined &&
          Number(x.purchase) !== 0
        )
        .map((x: any) => ({
          name: x.headName,
          amount: Number(x.purchase),
          code: x.headCode,
          avatarText: this.getInitials(x.headName),
          avatarColor: this.getAvatarColor(x.headName),
          isPnLLine: false
        }));

      // ----- RIGHT: Sales Accounts (hide 0.00) -----
      this.salesBase = this.ProfitlossList
        .filter((x: any) =>
          x.sales !== null &&
          x.sales !== undefined &&
          Number(x.sales) !== 0
        )
        .map((x: any) => ({
          name: x.headName,
          amount: Number(x.sales),
          code: x.headCode,
          avatarText: this.getInitials(x.headName),
          avatarColor: this.getAvatarColor(x.headName),
          isPnLLine: false
        }));

      // Build totals + net row
      this.buildProfitLossView();

      setTimeout(() => feather.replace());
    });
  }

  // =====================================================
  // BUILD VIEW (ADD NET PROFIT / NET LOSS LINE)
  // =====================================================
  private buildProfitLossView(): void {
    // Base totals (without net row)
    this.totalExpense = this.purchaseBase.reduce(
      (sum, r) => sum + (Number(r.amount) || 0), 0
    );

    this.totalSales = this.salesBase.reduce(
      (sum, r) => sum + (Number(r.amount) || 0), 0
    );

    // Net profit (can be negative)
    this.netProfit = this.totalSales - this.totalExpense;

    // Start from base arrays
    this.purchaseRows = [...this.purchaseBase];
    this.salesRows = [...this.salesBase];

    if (this.netProfit > 0) {
      // ---------- PROFIT ----------
      // Add Net Profit to Purchase side so:
      //   Purchase + NetProfit = Sales
      this.purchaseRows.push({
        name: 'Net Profit',
        amount: this.netProfit,
        code: '',
        avatarText: '',
        avatarColor: '',
        isPnLLine: true
      });

      this.leftGrandTotal  = this.totalExpense + this.netProfit; // = totalSales
      this.rightGrandTotal = this.totalSales;

    } else if (this.netProfit < 0) {
      // ---------- LOSS ----------
      const netLoss = Math.abs(this.netProfit);

      // Add Net Loss to Sales side so:
      //   Sales + NetLoss = Purchase
      this.salesRows.push({
        name: 'Net Loss',
        amount: netLoss,
        code: '',
        avatarText: '',
        avatarColor: '',
        isPnLLine: true
      });

      this.leftGrandTotal  = this.totalExpense;
      this.rightGrandTotal = this.totalSales + netLoss; // = totalExpense

    } else {
      // Break-even – both sides already equal
      this.leftGrandTotal  = this.totalExpense;
      this.rightGrandTotal = this.totalSales;
    }
  }

  // =====================================================
  // Helpers
  // =====================================================
  private getInitials(name: string): string {
    if (!name) { return ''; }
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  private getAvatarColor(key: string): string {
    const colors = ['#FFE1E1', '#FFEAD1', '#E8F2FF', '#EAF7E5', '#F5E1FF'];
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  // For top Net Profit card (green if profit, red if loss)
  get netProfitClass(): string {
    return this.netProfit >= 0 ? 'text-success' : 'text-danger';
  }
    private triggerDownload(data: string | Blob, fileName: string, mimeType: string): void {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  // =====================================================
  // SIMPLE EXCEL EXPORT (CSV)
  // =====================================================
  exportExcelSimple(): void {
    const rows: any[][] = [];

    // Title + summary
    rows.push(['Profit & Loss']);
    rows.push([]);
    rows.push(['Total Expense', this.totalExpense]);
    rows.push(['Total Sales', this.totalSales]);
    rows.push(['Net Profit', this.netProfit]);
    rows.push([]);

    // Purchase side
    rows.push(['Purchase Accounts']);
    rows.push(['Name', 'Code', 'Amount']);
    this.purchaseRows.forEach(r => {
      rows.push([
        r.name,
        r.code || '',
        Number(r.amount || 0).toFixed(2)
      ]);
    });

    rows.push([]);
    // Sales side
    rows.push(['Sales Accounts']);
    rows.push(['Name', 'Code', 'Amount']);
    this.salesRows.forEach(r => {
      rows.push([
        r.name,
        r.code || '',
        Number(r.amount || 0).toFixed(2)
      ]);
    });

    // Convert to CSV text
    const csv = rows
      .map(row =>
        row
          .map(col => {
            const v = col === null || col === undefined ? '' : col.toString();
            // Escape quotes
            return `"${v.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\r\n');

    // Excel can open .csv directly
    this.triggerDownload(csv, 'ProfitLoss.csv', 'text/csv;charset=utf-8;');
  }
  // =====================================================
  // SIMPLE PDF EXPORT (PRINT TO PDF)
  // =====================================================
exportPdfSimple(): void {
  const html = this.buildPrintHtml();

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) { return; }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.focus();
  printWindow.print();
}


 private buildPrintHtml(): string {
  const netProfitColor = this.netProfit >= 0 ? '#16a34a' : '#b91c1c'; // green / red

  const purchaseRowsHtml = this.purchaseRows.map(r => {
    const isNet = r.isPnLLine;
    return `
      <tr class="${isNet ? 'row-net' : ''}">
        <td class="name-cell">${r.name}</td>
        <td class="code-cell">${r.code || ''}</td>
        <td class="amount-cell">${Number(r.amount || 0).toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const salesRowsHtml = this.salesRows.map(r => {
    const isNet = r.isPnLLine;
    return `
      <tr class="${isNet ? 'row-net' : ''}">
        <td class="name-cell">${r.name}</td>
        <td class="code-cell">${r.code || ''}</td>
        <td class="amount-cell">${Number(r.amount || 0).toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Profit & Loss</title>
  <style>
    /* ===== Page background & base ===== */
    body {
      margin: 0;
      padding: 0;
      background: #f3f4f6;
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #111827;
    }
    .page {
      padding: 16px;
    }

    /* ===== Main card (similar to .pl-card) ===== */
    .pl-card {
      background: #ffffff;
      border-radius: 1.5rem;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
      padding: 16px 20px 20px 20px;
    }

    /* ===== Header ===== */
    .pl-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .pl-title {
      font-size: 16px;
      font-weight: 600;
      color: #2e5f73;
      margin: 0;
    }

    /* ===== Summary row ===== */
    .summary-row {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }
    .summary-card {
      flex: 1;
      border-radius: 0.75rem;
      padding: 8px 10px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }
    .summary-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      margin-bottom: 2px;
    }
    .summary-value {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
    }
    .summary-net {
      color: ${netProfitColor};
    }

    /* ===== Two-column layout with center divider ===== */
    .pl-columns {
      display: flex;
      gap: 16px;
      position: relative;
      margin-top: 4px;
    }
    .pl-col {
      width: 50%;
    }

    /* Vertical divider */
    .pl-divider {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 0;
      border-left: 1px dashed #e5e7eb;
    }

    .pl-column-header {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }

    /* ===== Table styles (mimic list look) ===== */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    thead th {
      background: #f3f4f6;
      font-weight: 600;
      text-align: left;
      padding: 4px 6px;
      border-bottom: 1px solid #e5e7eb;
    }
    tbody td {
      padding: 4px 6px;
      border-bottom: 1px solid #f3f4f6;
    }

    .name-cell {
      width: 55%;
    }
    .code-cell {
      width: 15%;
      color: #9ca3af;
      font-size: 10px;
    }
    .amount-cell {
      width: 30%;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    /* Net Profit / Net Loss row (matches .pl-net-row feel) */
    .row-net td {
      font-weight: 600;
      background: #eff6ff;
      color: #1d4ed8;
    }

    /* Total row at bottom */
    .row-total th,
    .row-total td {
      font-weight: 700;
      border-top: 1px solid #d1d5db;
      background: #f9fafb;
    }

    /* Small helpers */
    .mt-2 { margin-top: 8px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="pl-card">
      <!-- Header -->
      <div class="pl-header">
        <h1 class="pl-title">Profit &amp; Loss</h1>
      </div>

      <!-- Summary cards -->
      <div class="summary-row">
        <div class="summary-card">
          <div class="summary-label">Total Expense</div>
          <div class="summary-value">${this.totalExpense.toFixed(2)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Sales</div>
          <div class="summary-value">${this.totalSales.toFixed(2)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Net Profit</div>
          <div class="summary-value summary-net">${this.netProfit.toFixed(2)}</div>
        </div>
      </div>

      <!-- Two-column layout -->
      <div class="pl-columns">
        <div class="pl-divider"></div>

        <!-- LEFT: Purchase Accounts -->
        <div class="pl-col">
          <div class="pl-column-header">Purchase Accounts</div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${purchaseRowsHtml}
              <tr class="row-total">
                <td>Total</td>
                <td></td>
                <td class="amount-cell">${this.leftGrandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- RIGHT: Sales Accounts -->
        <div class="pl-col">
          <div class="pl-column-header">Sales Accounts</div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${salesRowsHtml}
              <tr class="row-total">
                <td>Total</td>
                <td></td>
                <td class="amount-cell">${this.rightGrandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  </div>
</body>
</html>
  `;
}


}
